import React, { Component } from 'react';
import url from './globals';
// import RNFS from 'react-native-fs';
import { Accelerometer, Magnetometer, Gyroscope } from 'expo-sensors';

import { 
  View, 
  Text, 
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView, ScrollView,
  Dimensions
} from 'react-native';

import { PermissionsAndroid } from 'react-native';
import WifiManager from "react-native-wifi-reborn";
// import CompassHeading from 'react-native-compass-heading';
import Canvas, { Image as CanvasImage } from 'react-native-canvas';
import { range } from './utils/sensors_utils';
import { useHeading, useStepLength } from './utils/customHooks';
// import { Pedometer } from 'expo-sensors';

// import WS from 'react-native-websocket'


class LiveNavigation extends Component {
  constructor (props) {
    super(props);
    // Constant declarations
    
    this.state = {
      // ws: '',
      // deviceId: -1,
      pins: [],
      
      wifis: [],
      knns: [],
      timeToScan: 0,
      runningTest: false,
      scanning: false,
      currentRoom: '',

      touchPos: {x: 0, y: 0},
      imageDims: {width: 1, height: 1},

      compassHeading: 0,
      offset: 260,
      rotation: 0,

      ctx: '',
      canvas: '',
      windowWidth: Dimensions.get('window').width,
      dt: 100,
      accelerometerData: { x: 0, y: 0, z: 0 },
      magnetometerData: { x: 0, y: 0, z: 0 },
      gyroscopeData: { x: 0, y: 0, z: 0 },
    };
  }

  componentDidMount() {
    this._subscribeToAccelerometer();
    this._subscribeToMagnetometer();
    this._subscribeToGyroscope();
    this.getPins();
    console.log("LiveNavigation Component Mounted")
  }
  
  componentWillUnmount() {
    this._unsubscribeFromAccelerometer();
    this._unsubscribeFromMagnetometer();
    this._unsubscribeFromGyroscope();
  }

  _subscribeToAccelerometer = () => {
    this._accelerometerSubscription = Accelerometer.addListener(accelerometerData => {
      // console.log(accelerometerData)
      this.setState({ accelerometerData })
    });
    Accelerometer.setUpdateInterval(100);
  };

  _unsubscribeFromAccelerometer = () => {
    this._accelerometerSubscription && this._accelerometerSubscription.remove();
    this._accelerometerSubscription = null;
  };

  _subscribeToMagnetometer = () => {
    this._magnetometerSubscription = Magnetometer.addListener(magnetometerData => {
      // console.log("mag:", magnetometerData)
      let angle = this._angle(magnetometerData);
      this.setState({ 
        magnetometerData,
        rotation: angle
      })
    });
    Magnetometer.setUpdateInterval(100);
  };

  _unsubscribeFromMagnetometer = () => {
    this._magnetometerSubscription && this._magnetometerSubscription.remove();
    this._magnetometerSubscription = null;
  };

  _subscribeToGyroscope = () => {
    this._gyroscopeSubscription = Gyroscope.addListener(gyroscopeData => {
      // console.log("gyro", gyroscopeData)
      this.setState({ gyroscopeData })
    });
    Gyroscope.setUpdateInterval(100);
  };

  _unsubscribeFromGyroscope = () => {
    this._gyroscopeSubscription && this._gyroscopeSubscription.remove();
    this._gyroscopeSubscription = null;
  };

  _angle = (magnetometerData) => {
    let angle = 0;
    if (magnetometerData) {
      let { x, y, z } = magnetometerData;
      if (Math.atan2(y, x) >= 0) {
        angle = Math.atan2(y, x) * (180 / Math.PI);
      } else {
        angle = (Math.atan2(y, x) + 2 * Math.PI) * (180 / Math.PI);
      }
    }
    return Math.round(angle);
  };

  handleCanvas = (canvas) => {
    if (!canvas) return;
    canvas.width = this.state.windowWidth;
    canvas.height = 350;
    const ctx = canvas.getContext('2d');

    let base_image = new CanvasImage(canvas);
    base_image.src = 'https://sensordata.space/images/Floor_Layout.png'
    base_image.addEventListener('load', () => {
      // console.log("image loaded")
      ctx.drawImage(base_image, 0, 0, canvas.width, canvas.height);
      this.drawCircle(canvas);
    });
  }

  drawCircle = (canvas) => {
    const ctx = canvas.getContext('2d');

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 4;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = 'black';
    ctx.fill();
    ctx.stroke();
  }

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
    console.log(wifis);
    let data = {
      deviceId: this.state.deviceId,
      message: 'TEST_POINT',
      point: pointToSend,
      floor_plan_id: 1,
      networks: wifis
    }
    // this.state.ws.send(JSON.stringify(data)) // sending with socket did not work (database access was problematic) 
    
    // so we send it with a post Req
    const res = await fetch('http://'+url+':8000/localize/knn/', {
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
      
    })

    // so we send it with a post Req
    const res2 = await fetch('http://'+url+':8000/localize/room_knn/', {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    const room_knn = await res2.json()
    console.log("Room Prediction: ", room_knn)
    this.setState({
      currentRoom: room_knn.room_pred,
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
    fetch("http://"+url+":8000/api/signalPoints/")
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

  render () {
    return (
      
      <SafeAreaView style={styles.container}>
        {/* <Image 
          style={[{width: 0, height: 0}]} 
          onLoadEnd={() => {
            console.log("image loaded!")
            // this.setState({ isLoaded: true })
            const image = new CanvasImage(this.state.canvas, this.state.canvas.width, this.state.canvas.height)
          }}
          source = {require('../images/Floor_Layout.png')} 
        /> */}

        <ScrollView style={styles.scrollView}>
          <Text style={styles.text}>Rot: {this.state.rotation}, Comp: {this.state.compassHeading}</Text>
          {/* <Text style={styles.text}>Room: {this.state.currentRoom}</Text> */}
          {/* <Text style={styles.text}>x: {this.state.touchPos.x}, y: {this.state.touchPos.y}</Text> */}
          <Text style={styles.text}>steps: {this.state.currentStepCount}</Text>
          <Text style={styles.text}>x = {this.state.accelerometerData.x.toFixed(2)}
            {', '}y = {this.state.accelerometerData.y.toFixed(2)}
            {', '}z = {this.state.accelerometerData.z.toFixed(2)}</Text>
            <Text style={styles.text}>x = {this.state.magnetometerData.x.toFixed(2)}
            {', '}y = {this.state.magnetometerData.y.toFixed(2)}
            {', '}z = {this.state.magnetometerData.z.toFixed(2)}</Text>
            <Text style={styles.text}>x = {this.state.gyroscopeData.x.toFixed(2)}
            {', '}y = {this.state.gyroscopeData.y.toFixed(2)}
            {', '}z = {this.state.gyroscopeData.z.toFixed(2)}</Text>
          {/* The icon of the User */}
              {/* <View style={styles.gpsIcon}>
                
              </View> */}

          {/* this is the layout image */}
          <TouchableOpacity onPress={(evt) => this.handlePress(evt) } activeOpacity={1}>
            <View style={styles.imageContainer} onLayout={(event) => { this.find_dimesions(event.nativeEvent.layout) }}>
              <Canvas 
                      // width={300}
                      ref={this.handleCanvas}
                      // onClick={() => this.handleClick()}
              />
              {/* <Image style={styles.layoutImage} source = {require('../images/Floor_Layout.png')} /> */}
{/*               
              <View style={[{width: 10}, {height: 10}, {position: 'absolute'}, {top: this.state.touchPos.y}, {left: this.state.touchPos.x} ]}>
                <Image style={styles.layoutImage} source = {require('../images/gps2.png')}/>
              </View> */}
  
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