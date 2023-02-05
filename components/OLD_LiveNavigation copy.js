import React, { useState, useEffect, useRef } from 'react';
import {url} from './globals';
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
import Canvas, { Image as CanvasImage } from 'react-native-canvas';
import { range } from './utils/sensors_utils';
import { useHeading, useStepLength } from './utils/customHooks';
import CompassHeading from 'react-native-compass-heading';

function LiveNavigation() {

  const canvasRef = useRef(null);

  const [pins, setPins] = useState([]);
  const [wifis, setWifis] = useState([]);
  const [knns, setKnns] = useState([]);
  const [timeToScan, setTimeToScan] = useState(0);
  const [runningTest, setRunningTest] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [currentRoom, setCurrentRoom] = useState('');
  const [touchPos, setTouchPos] = useState({x: 0, y: 0});
  const [imageDims, setImageDims] = useState({width: 1, height: 1});
  const [compassHeading, setCompassHeading] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [location, setLocation] = useState({x: 0, y: 0})

  const [accelerometerData, setAccelerometerData] = useState({ x: 0, y: 0, z: 0 });
  const [magnetometerData, setMagnetometerData] = useState({ x: 0, y: 0, z: 0 });
  const [gyroscopeData, setGyroscopeData] = useState({ x: 0, y: 0, z: 0 });

  // const [canvasBG, setCanvasBG] = useState(null);
  const [steps, setSteps] = useState(0);
  
  
  // offset: 260
  const windowWidth = Dimensions.get('window').width;
  const windowHeight = Dimensions.get('window').height;

  const dt = 100;

  // Custom Hooks
  const heading = useHeading(accelerometerData, magnetometerData, gyroscopeData);
  const [stepLength, headingStep] = useStepLength(accelerometerData, magnetometerData, gyroscopeData);

  // run once on mount
  useEffect(() => {
    // const degree_update_rate = 1;

    // CompassHeading.start(degree_update_rate, ({heading, accuracy}) => {
    //   console.log('CompassHeading: ', heading, accuracy);
    //   setRotation(heading);
    // });



    // const config = {
    //   default_threshold: 15.0,
    //   default_delay: 150000000,
    //   cheatInterval: 3000,
    //   onStepCountChange: (stepCount) => { setSteps(stepCount) },
    //   onCheat: () => { console.log("User is Cheating") }
    // }
    // startCounter(config);
    Accelerometer.addListener((data) => {
      setAccelerometerData(data);
    });
    Magnetometer.addListener((data) => {
      setMagnetometerData(data);
    });
    Gyroscope.addListener((data) => {
      setGyroscopeData(data);
    });
    Accelerometer.setUpdateInterval(dt);
    Magnetometer.setUpdateInterval(dt);
    Gyroscope.setUpdateInterval(dt);
    _initCanvas(canvasRef.current);
    console.log("canvas:", canvasRef.current.width, canvasRef.current.height);
    return () => {
      Accelerometer.removeAllListeners();
      Magnetometer.removeAllListeners();
      Gyroscope.removeAllListeners();
      // CompassHeading.stop();
      // stopCounter();
    };
  }, []);
  
  useEffect(() => {
    // if (lineWidth.val > 5 || lineWidth.val < 2.5) {
    //   setLineWidth((lw) => ({ ...lw, sum: -lw.sum }));
    // }
    // setLineWidth((lw) => ({ ...lw, val: lw.val + lw.sum }));
    _handleCanvas(canvasRef.current);
    setRotation(heading);
    setCompassHeading(radsToDegs(heading))
    // console.log(heading)
  }, [heading]);

  useEffect(() => {
    if (!stepLength) return;
    let nx = stepLength ? stepLength * Math.sin(heading) * 20 : 0,
      ny = stepLength ? stepLength * Math.cos(heading) * 20 : 0;
    
    if (nx > canvasRef.current.width || nx < 0) {
      nx = location.x // same as the old one
    }

    if (ny > canvasRef.current.height || ny < 0) {
      ny = location.y // same as the old one
    }
    
    let newPoint = {
      x: location.x ? location.x + nx : canvasRef.current.width / 2,
      y: location.y ? location.y - ny : canvasRef.current.height / 2
    }

    if (location.x !=0 && location.y !=0) drawLine(canvasRef.current, location, newPoint);
    drawCircle(canvasRef.current, newPoint);

    setLocation((l) => ({
      x: l.x ? l.x + nx : canvasRef.current.width / 2,
      y: l.y ? l.y - ny : canvasRef.current.height / 2,
    }));

    _handleCanvas(canvasRef.current);
    // console.log(stepLength)
    setSteps((s) => s++)
  }, [stepLength]);
  

  const _initCanvas = (canvas) => {
    canvas.width = windowWidth;
    canvas.height = 350;
    const ctx = canvas.getContext('2d');
    // ctx.clearRect(0, 0, canvas.width, canvas.height);
    // _current_user(ctx, location.x, location.y);
    let base_image = new CanvasImage(canvas);
    base_image.src = 'https://sensordata.space/images/Floor_Layout.png'
    base_image.addEventListener('load', () => {
      ctx.drawImage(base_image, 0, 0, canvas.width, canvas.height);
      drawCircle(canvas, {x:canvas.width/2, y:canvas.height/2});
    });
  };

  const _handleCanvas = (canvas) => {
    const ctx = canvas.getContext('2d');
    // ctx.drawImage(canvasBG, 0, 0, canvas.width, canvas.height);
  }

  const drawCircle = (canvas, point) => {
    const ctx = canvas.getContext('2d');
    const radius = 2;

    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = 'black';
    ctx.fill();
    ctx.stroke();
  }

  const drawLine = (canvas, pointStart, pointEnd) => {
    const ctx = canvas.getContext('2d');

    ctx.beginPath();
    ctx.moveTo(pointStart.x, pointStart.y);
    ctx.lineTo(pointEnd.x, pointEnd.y)
    ctx.stroke();
  }

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
      setScanning(true)
      let start = new Date();
      let wifis = await WifiManager.reScanAndLoadWifiList();
      let end = new Date();
      var difference = end - start;
      
      setTimeToScan(difference)
      setScanning(false)
      setWifis(wifis)
      console.log("scan took: " + difference);

    } else {
      console.log('permition is not granted')
    }
  }

  const runTest = async () => {
    setRunningTest(true)
    
    // console.log(this.state.wifis)
    await scanWifi();
    // console.log(this.state.wifis)
    console.log("scan done")
    //send point to server
    let pointToSend = {
      x: touchPos.x / imageDims.width,
      y: touchPos.y / imageDims.height
    }
    let wifis_temp = wifis;
    wifis_temp = wifis_temp.map(item => {
      return {
        BSSID: item.BSSID,
        level: item.level  // just keep these 2, we dont need the rest information for now
      }
    })
    console.log(wifis_temp);
    let data = {
      deviceId: deviceId,
      message: 'TEST_POINT',
      point: pointToSend,
      floor_plan_id: 1,
      networks: wifis_temp
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
    setKnns(data_knns)

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
    
    setCurrentRoom(room_knn.room_pred)
    setRunningTest(false)
  }

  const handlePress = (evt) => {
    let x = Math.floor(evt.nativeEvent.locationX);
    let y = Math.floor(evt.nativeEvent.locationY);
    console.log("x:" + x + ", y:" + y);
    
    setTouchPos({ x: x, y: y })
    
  }

  const find_dimesions = (layout) => {
    const {x, y, width, height} = layout;
    // console.log(width);
    // console.log(height);
    setImageDims({ width: width, height: height })
    
  }

  const getPins = () => {
    fetch("http://"+url+":8000/api/signalPoints/")
    .then(resp => resp.json())
    .then(data => {
       // console.log(data)
       setPins(data)
       
       console.log("Got pins")
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

  const radsToDegs = rad => 360 - rad * 180 / Math.PI;
  
  return(
      <SafeAreaView style={styles.container}>

        <ScrollView style={styles.scrollView}>
          <Text style={styles.text}>Rot: {rotation.toFixed(4)}, Comp: {compassHeading.toFixed(4)}</Text>
          {/* <Text style={styles.text}>Room: {this.state.currentRoom}</Text> */}
          {/* <Text style={styles.text}>x: {this.state.touchPos.x}, y: {this.state.touchPos.y}</Text> */}
          {/* <Text style={styles.text}>steps: {currentStepCount}</Text> */}
          <Text style={styles.text}>steps: {steps}</Text>
          <Text style={styles.text}>x: {location.x.toFixed(4)}, y: {location.y.toFixed(4)}</Text>
          <Text style={styles.text}>x = {accelerometerData.x.toFixed(2)}
            {', '}y = {accelerometerData.y.toFixed(2)}
            {', '}z = {accelerometerData.z.toFixed(2)}</Text>
            <Text style={styles.text}>x = {magnetometerData.x.toFixed(2)}
            {', '}y = {magnetometerData.y.toFixed(2)}
            {', '}z = {magnetometerData.z.toFixed(2)}</Text>
            <Text style={styles.text}>x = {gyroscopeData.x.toFixed(2)}
            {', '}y = {gyroscopeData.y.toFixed(2)}
            {', '}z = {gyroscopeData.z.toFixed(2)}</Text>
          {/* The icon of the User */}
              {/* <View style={styles.gpsIcon}>
                
              </View> */}

          {/* this is the layout image */}
          <TouchableOpacity onPress={(evt) => handlePress(evt) } activeOpacity={1}>
            <View style={styles.imageContainer} onLayout={(event) => { find_dimesions(event.nativeEvent.layout) }}>
              <Canvas 
                      // width={300}
                      ref={canvasRef}
                      // onClick={() => this.handleClick()}
              />
              {knns.map((item, index) => (
                <View key={index} style={[{width: 10}, {height: 10}, {position: 'absolute'}, {top: adjustPoint(item.x, item.y).y}, {left: adjustPoint(item.x, item.y).x}]}>
                  <Image style={styles.layoutImage} source = {require('../images/gps2_green.png')}/>
                  <Text style={[{fontSize: 7,}]}>{index}</Text>
                </View>
              ))}
              
            </View>
          </TouchableOpacity>
          
          {/* Button to scan the Wifis */}
          <TouchableOpacity onPress={runTest} style={[styles.appButtonContainer, {opacity: runningTest? 0.6 : 1}]} disabled={runningTest}>
            <Text style={styles.appButtonText}>Run Test</Text>
          </TouchableOpacity>

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

export default LiveNavigation;