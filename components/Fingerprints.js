import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  SafeAreaView, ScrollView, StatusBar
} from 'react-native';

// import { Col, Row, Grid } from "react-native-easy-grid";

import { PermissionsAndroid } from 'react-native';
import WifiManager from "react-native-wifi-reborn";
import CompassHeading from 'react-native-compass-heading';

import Header from "./Header";

const Fingerprints = (props) => {
  const [deviceId, setDeviceId] = useState(-1);

  const [pins, setPins] = useState([]);

  const [wifis, setWifis] = useState([]);
  const [timeToScan, setTimeToScan] = useState(0);
  const [scanning, setScanning] = useState(false);

  const [touchPos, setTouchPos] = useState({x: 0, y: 0});
  const [imageDims, setImageDims] = useState({width: 1, height: 1});
  const [compassHeading, setCompassHeading] = useState(0);
  // const offset = 260;
  const [rotation, setRotation] = useState(0);
  
  // const [ws, setWs] = useState(new WebSocket('ws://192.168.1.42:8000/ws/graph/'));

  // var ws = new WebSocket('ws://192.168.1.42:8000/ws/graph/');
  var ws = useRef(new WebSocket('ws://192.168.1.42:8000/ws/graph/')).current;
  ws.onopen = () => {
    // connection opened
    
  };

  ws.onmessage = (e) => {
    // a message was received
    // console.log("Data: ", e.data);
    let dataJson = JSON.parse(e.data);
    if (dataJson.message == "CONNECTED") {
      // console.log(dataJson.id);
      setDeviceId(dataJson.id);
      let data = {
        message: "something",
        id: dataJson.id
      }
      ws.send(JSON.stringify(data)); // send a message
    } else if (dataJson.message == "SCAN_FINISHED") {
      console.log("SCAN_FINISHED")
      getPins();
    }
  };

  ws.onerror = (e) => {
    // an error occurred
    console.log("Error: ", e.message);
  };

  ws.onclose = (e) => {
    // connection closed
    console.log("Closed: ", e.code, e.reason);
    // setTimeout(() => {this.setState({timePassed: true})}, 1000)
    setDeviceId(-1)
  };
  
  useEffect(() => {
    getPins();
  }, []) // add dependencies in the array to run useEffect every time a dependency changes

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

  const scanWifi = async () => {
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
      setScanning(true);
      let start = new Date();
      let wifis = await WifiManager.reScanAndLoadWifiList();
      let end = new Date();
      var difference = end - start;
      setTimeToScan(difference);
      setScanning(false);
      setWifis(wifis);
      console.log("scan took: " + difference, wifis);

      //send point to server
      let pointToSend = {
        x: touchPos.x / imageDims.width,
        y: touchPos.y / imageDims.height
      } 
      let data = {
        message: 'NEW_POINT',
        point: pointToSend,
        floor_plan_id: 1,
        wifiList: wifis
      }
      ws.send(JSON.stringify(data))
    } else {
      console.log('permition is not granted')
    }
  }

  const handlePress = (evt) => {
    let x = Math.floor(evt.nativeEvent.locationX);
    let y = Math.floor(evt.nativeEvent.locationY);
    console.log("x:" + x + ", y:" + y);
    setTouchPos({
      x: x,
      y: y
    })
  }

  const find_dimesions = (layout) => {
    const {x, y, width, height} = layout;
    // console.log(width);
    // console.log(height);
    setImageDims({
      width: width,
      height: height 
    })
  }

  const getPins = () => {
    fetch("http://192.168.1.42:8000/api/signalPoints/")
    .then(resp => resp.json())
    .then(data => {
       // console.log(data)
       setPins(data)
    })
    .catch(err => {
      console.log("Error Fetching data: ", err)
    })
  }

  const adjustPoint = (x,y) => {
    let w = imageDims.width;
    let h = imageDims.height;
    return {
      x: Math.floor(x*w) - 5, // half the width of the icon
      y: Math.floor(y*h) - 10 // all the height of the icon // do this in order for the icon to point excactly to the point on the map
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.text}>SocketId: {deviceId}</Text>
        <Text style={styles.text}>Rot: {rotation}, Comp: {compassHeading}</Text>
        <Text style={styles.text}>x: {touchPos.x}, y: {touchPos.y}</Text>


        {/* this is the layout image */}
        <TouchableOpacity onPress={(evt) => handlePress(evt) } activeOpacity={1}>
          <View style={styles.imageContainer} onLayout={(event) => { find_dimesions(event.nativeEvent.layout) }}>
            <Image style={styles.layoutImage} source = {require('../images/Floor_Layout.png')} />
            
            {/* The icon of the User */}
            <View style={styles.gpsIcon}>
              <Image style={[
                styles.layoutImage, 
                {transform: [{rotate: `${rotation}deg`}]}
              ]} source = {require('../images/gps2.png')} />
            </View>

            {pins.map((item, index) => (
              <View key={index} style={[{width: 10}, {height: 10}, {position: 'absolute'}, {top: adjustPoint(item.x, item.y).y}, {left: adjustPoint(item.x, item.y).x}]}>
                <Image style={styles.layoutImage} source = {require('../images/gps2.png')}/>
              </View>
            ))}
            
          </View>
        </TouchableOpacity>
        
        {/* Button to scan the Wifis */}
        <TouchableOpacity onPress={scanWifi} style={styles.appButtonContainer}>
          <Text style={styles.appButtonText}>Scan Wifi</Text>
        </TouchableOpacity>

        {/* Pins so far
        <View>
          <FlatList
            data={pins}
            renderItem={ ({item}) => 
              <View>
                <Text style={styles.item}>x:{adjustPoint(item.x, item.y).x}, y:{adjustPoint(item.x, item.y).y}</Text>
              </View>
            }
          />
        </View> */}
      </ScrollView>
    </SafeAreaView>
  )
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

export default Fingerprints;