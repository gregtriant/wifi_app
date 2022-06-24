import React, { Component } from 'react';

import { 
  View, 
  Text, 
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView, ScrollView
} from 'react-native';

import { PermissionsAndroid } from 'react-native';
import WifiManager from "react-native-wifi-reborn";
import CompassHeading from 'react-native-compass-heading';
import WS from 'react-native-websocket'

class LiveNavigation extends Component {
  constructor (props) {
    super(props);
    this.state = {
      ws: '',
      deviceId: -1,
      pins: [],
      
      wifis: [],
      knns: [],
      timeToScan: 0,
      runningTest: false,
      scanning: false,

      touchPos: {x: 0, y: 0},
      imageDims: {width: 1, height: 1},

      compassHeading: 0,
      offset: 260,
      rotation: 0
    };
  }

  componentDidMount() {
    this.getPins();
  }
  
  // useEffect(() => {
  //   getPins();
  // }, []) // add dependencies in the array to run useEffect every time a dependency changes

  // useEffect(() => {
  //   console.log("LiveNavigation Component Mounted")
  //   const degree_update_rate = 2;

  //   // accuracy on android will be hardcoded to 1
  //   // since the value is not available.
  //   // For iOS, it is in degrees
  //   CompassHeading.start(degree_update_rate, ({heading, accuracy}) => {
  //     setCompassHeading(heading);
  //     setRotation((offset + heading)%360);
  //     console.log("angle: " + heading);
  //   });

  //   return () => {
  //     CompassHeading.stop();
  //   };
  // });

  scanWifi = async () => {
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: 'Location permission is required for WiFi connections',
      message:
        'This app needs location permission as this is required  ' +
        'to scan for wifi networks.',
      buttonNegative: 'DENY',
      buttonPositive: 'ALLOW',
    },);
    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      console.log('scanning')
      this.setState({
        scanning: true
      })
      let start = new Date();
      let wifis = await WifiManager.reScanAndLoadWifiList();
      let end = new Date();
      var difference = end - start;
      this.setState({
        timeToScan: difference,
        scanning: false,
        wifis: wifis
      })
      console.log("scan took: " + difference);

    } else {
      console.log('permition is not granted')
    }
  }

  runTest = async () => {
    this.setState({
      runningTest: true
    })
    // console.log(this.state.wifis)
    await this.scanWifi();
    // console.log(this.state.wifis)
    console.log("scan done")
    //send point to server
    let pointToSend = {
      x: this.state.touchPos.x / this.state.imageDims.width,
      y: this.state.touchPos.y / this.state.imageDims.height
    }
    let wifis = this.state.wifis;
    wifis = wifis.map(item => {
      return {
        BSSID: item.BSSID,
        level: item.level  // just keep these 2, we dont need the rest information for now
      }
    })
    // console.log(wifis);
    let data = {
      deviceId: this.state.deviceId,
      message: 'TEST_POINT',
      point: pointToSend,
      floor_plan_id: 1,
      networks: wifis
    }
    // this.state.ws.send(JSON.stringify(data)) // sending with socket did not work (database access was problematic) 
    
    // so we send it with a post Req
    const res = await fetch('http://192.168.1.42:8000/localize/knn/', {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    const data_knns = await res.json()
    console.log("Found Knns: ", data_knns)
    this.setState({
      knns: data_knns,
      runningTest: false
    })
  }

  handlePress = (evt) => {
    let x = Math.floor(evt.nativeEvent.locationX);
    let y = Math.floor(evt.nativeEvent.locationY);
    console.log("x:" + x + ", y:" + y);
    
    this.setState({
      touchPos: {
        x: x,
        y: y
      }
    })
  }

  find_dimesions = (layout) => {
    const {x, y, width, height} = layout;
    // console.log(width);
    // console.log(height);
    this.setState({
      imageDims: {
        width: width,
        height: height 
      }
    })
  }

  getPins = () => {
    fetch("http://192.168.1.42:8000/api/signalPoints/")
    .then(resp => resp.json())
    .then(data => {
       // console.log(data)
       this.setState({
         pins: data
       })
       console.log("Got pins")
    })
    .catch(err => {
      console.log("Error Fetching data: ", err)
    })
  }

  adjustPoint = (x,y) => {
    let w = this.state.imageDims.width;
    let h = this.state.imageDims.height;
    return {
      x: Math.floor(x*w) - 5, // half the width of the icon
      y: Math.floor(y*h) - 10 // all the height of the icon // do this in order for the icon to point excactly to the point on the map
    }
  }

  gotWSMessage(dataJson) {
    console.log("--> Message from server: ", dataJson)

    if (dataJson.message == "CONNECTED") {
      let id = dataJson.id
      this.setState({
        deviceId: id
      })
    }

    else if (dataJson.message == "RESULT_POINT") {
      
    }
  }

  render () {
    return (
      <SafeAreaView style={styles.container}>
        <WS
          ref={ref => {
            this.ws = ref
            this.state.ws = ref
          }}
          url='ws://192.168.1.42:8000/ws/graph/'
          onOpen={() => {
            console.log('WS Connection Opened!')
            // let data = {
            //   message: "hello"
            // }
            // this.ws.send(JSON.stringify(data))
          }}
          onMessage={(res) => {
            let dataJson = JSON.parse(res.data)
            this.gotWSMessage(dataJson)
          }}
          onError={err => console.log("WS Error:", err)}
          onClose={err => console.log("WS closed", err)}
          reconnect // Will try to reconnect onClose
        />
  
        <ScrollView style={styles.scrollView}>
          <Text style={styles.text}>SocketId: {this.state.deviceId}</Text>
          <Text style={styles.text}>Rot: {this.state.rotation}, Comp: {this.state.compassHeading}</Text>
          <Text style={styles.text}>x: {this.state.touchPos.x}, y: {this.state.touchPos.y}</Text>
  
  
          {/* this is the layout image */}
          <TouchableOpacity onPress={(evt) => this.handlePress(evt) } activeOpacity={1}>
            <View style={styles.imageContainer} onLayout={(event) => { this.find_dimesions(event.nativeEvent.layout) }}>
              <Image style={styles.layoutImage} source = {require('../images/Floor_Layout.png')} />
              
              {/* The icon of the User */}
              {/* <View style={styles.gpsIcon}>
                <Image style={[
                  styles.layoutImage, 
                  {transform: [{rotate: `${this.state.rotation}deg`}]}
                ]} source = {require('../images/gps2.png')} />
              </View> */}
              
              <View style={[{width: 10}, {height: 10}, {position: 'absolute'}, {top: this.state.touchPos.y}, {left: this.state.touchPos.x} ]}>
                <Image style={styles.layoutImage} source = {require('../images/gps2.png')}/>
              </View>
  
              {this.state.knns.map((item, index) => (
                <View key={index} style={[{width: 10}, {height: 10}, {position: 'absolute'}, {top: this.adjustPoint(item.x, item.y).y}, {left: this.adjustPoint(item.x, item.y).x}]}>
                  <Image style={styles.layoutImage} source = {require('../images/gps2_green.png')}/>
                  <Text style={[{fontSize: 7,}]}>{index}</Text>
                </View>
              ))}
              
            </View>
          </TouchableOpacity>
          
          {/* Button to scan the Wifis */}
          <TouchableOpacity onPress={this.runTest} style={[styles.appButtonContainer, {opacity: this.state.runningTest? 0.6 : 1}]} disabled={this.state.runningTest}>
            <Text style={styles.appButtonText}>Run Test</Text>
          </TouchableOpacity>
          
          
        </ScrollView>
      </SafeAreaView>
    )
  }
}

// var {height, width} = Dimensions.get('window');
const styles = StyleSheet.create({
  gpsIcon: {
    width: 20,
    height: 20,
    position: 'absolute',
    top: 190,
    left: 290,
  },  
  imageContainer: {
    width: "100%",
    height: 350,
    // borderWidth: 1,
    // borderColor: "#000",
  },
  layoutImage: {
    height: '100%',
    width: '100%',
    resizeMode: "contain",
  },
  header: {
    height: 60,
    padding: 15,
    backgroundColor: 'darkslateblue'
  },
  text: {
    color: '#000',
    fontSize: 23,
    textAlign: 'center'
  },
  appButtonContainer: {
    marginTop: 25,
    marginHorizontal: 80,
    elevation: 8,
    backgroundColor: "#902343",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  appButtonText: {
    fontSize: 18,
    color: "#fff",
    // fontWeight: "bold",
    alignSelf: "center",
    letterSpacing: 2,
    // textTransform: "uppercase"
  },
  container: {
    flex: 1,
    // paddingTop: StatusBar.currentHeight,
  },
  scrollView: {
    backgroundColor: 'lightgray',
    // marginHorizontal: 20,
  },
});

export default LiveNavigation;