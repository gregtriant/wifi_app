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


import url from './globals';

Math.floor(600*0.773333)

// import { Col, Row, Grid } from "react-native-easy-grid";

import { PermissionsAndroid } from 'react-native';
import WifiManager from "react-native-wifi-reborn";
// import CompassHeading from 'react-native-compass-heading';

// import Header from "./Header";

const Fingerprints = (props) => {

  const [pins, setPins] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [pointScans, setPointScans] = useState([]);

  const [wifis, setWifis] = useState([]);
  const [timeToScan, setTimeToScan] = useState(0);
  const [scanning, setScanning] = useState(false);

  const [touchPos, setTouchPos] = useState({x: 0, y: 0});
  const [imageDims, setImageDims] = useState({width: 1, height: 1});
  const [compassHeading, setCompassHeading] = useState(0);
  // const offset = 260;
  const [rotation, setRotation] = useState(0);
  
  const [selectedPin, setSelectedPin] = useState({x:0, y:0}); // from 0 to 129 (or total pins)
  const [selectedRoute, setSelectedRoute] = useState();
  const [selectedPoint, setSelectedPoint] = useState(); // from 0 to len(selectedRoute)
  
  useEffect(() => {
    getRoutes();
    getPointScans();
  }, []) // add dependencies in the array to run useEffect every time a dependency changes

  const getPointScans = () => {
    console.log("getting total scans of each point from:" + "http://"+ url +":8000/1/point_scans/");
    fetch("http://"+ url +":8000/1/point_scans/")
    .then(resp => resp.json())
    .then(data => {
      // console.log(data)
      setPointScans(data);
    })
    .catch(err => {
      console.log("Error Fetching data: ", err)
    })
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
      if (isNaN(selectedPoint) || isNaN(selectedRoute)) {
        console.log("no point selected, cant do scan")
        return;
      }
      console.log('scanning')
      setScanning(true);
      let start = new Date();
      let wifis = await WifiManager.reScanAndLoadWifiList();
      let end = new Date();
      var difference = end - start;
      setTimeToScan(difference);

      // console.log(wifis);
      setWifis(wifis);
      // send new point to server
      let data = {
        "message": "NEW_POINT",
        "route": parseInt(selectedRoute),
        "point": parseInt(selectedPoint),
        "wifis": wifis,
        "floor_plan_id": 1
      }
      console.log(data);
      const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      };
      try {
        const fetchResponse = await fetch('http://'+url+':8000/1/fingerprinting/', requestOptions);
        const data = await fetchResponse.json();
        console.log(data);
        getPointScans();
        setScanning(false);
      } catch (e) {
        console.log(e);
        setScanning(false);
      }

    } else {
      console.log('permition is not granted')
    }
  }

  const handlePress = (evt) => {
    // console.log(evt.nativeEvent)
    const w = imageDims.width;
    const h = imageDims.height;

    let x = Math.floor(evt.nativeEvent.pageX); //locationX
    let y = Math.floor(evt.nativeEvent.pageY - 118.48); //locationY To avoid the overlay of other icons on top of the floorplan layout
    console.log("x:" + x + ", y:" + y);
    setTouchPos({
      x: x,
      y: y
    })
    // find the closest point to the press
    var minDist = 2000000;
    var index = 0;
    if (pins.length == 0) {
      getRoutes();
      return
    };

    for (let i=0; i<pins.length; i++) {
      let point = pins[i];
      let point_x = Math.floor(point.x*w);
      let point_y = Math.floor(point.y*h);
      let dist = Math.sqrt((x-point_x)*(x-point_x) + (y-point_y)*(y-point_y));
      if (dist < minDist) {
        minDist = dist;
        index = i;
      }
    }
    
    console.log("dist:", minDist, "i:", index);
    setSelectedPin({
      x: Math.floor(pins[index].x * w),
      y: Math.floor(pins[index].y * h)
    })
    // console.log(selectedPin);
    
    // find route and point
    for (let i=0; i<routes.length; i++) {
      let pointsOfRoute = JSON.parse(routes[i].points)
      for (let j=0; j<pointsOfRoute.length; j++) {
        if (Math.floor(pointsOfRoute[j].x * w) == Math.floor(pins[index].x * w) && Math.floor(pointsOfRoute[j].y * h) == Math.floor(pins[index].y * h)) {
          setSelectedRoute(i);
          setSelectedPoint(j);
          break;
        }
      }
    }
    
  }

  const find_dimesions = (layout) => {
    // console.log(layout)
    getRoutes();
    const {x, y, width, height} = layout;
    console.log("container width:", width);
    console.log("conteiner height:", height);
    setImageDims({
      width: width,
      height: height 
    })
  }

  const getRoutes = () => {
    console.log("getting routes from:" + "http://"+ url +":8000/api/routes/?floor_plan_id=1");
    fetch("http://"+ url +":8000/api/routes/?floor_plan_id=1")
    .then(resp => resp.json())
    .then(data => {
      // console.log(data)
      setRoutes(data);
      var totalPins = [];
      routes.forEach(route => {
        let pointsOfRoute = JSON.parse(route.points)
        // totalPins.push(pointsOfRoute)
        pointsOfRoute.forEach(point => {
          // console.log(point)
          totalPins.push(point);
        })
      });
      setPins(totalPins);
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
        <View style={styles.wrapperView}>
          <Text style={styles.text}>Route: {selectedRoute}, Point: {selectedPoint}</Text>
          <Text style={styles.text}>x: {touchPos.x}, y: {touchPos.y}</Text>

          {/* <Canvas ref={this.handleCanvas}/> */}

          {/* this is the layout image */}
        
          <View style={styles.imageContainer} onTouchStart={(e) => handlePress(e)} onLayout={(event) => { find_dimesions(event.nativeEvent.layout) }}>
            
            <Image style={styles.layoutImage} source = {require('../images/Floor_Layout.png')} />
            
            {/* show pins */}
            {pins.length > 0 && pins.map((item, index) => (
              <View key={index} style={[{width: 10}, {height: 10}, {position: 'absolute'}, {top: adjustPoint(item.x, item.y).y}, {left: adjustPoint(item.x, item.y).x}]}>
                <Image style={styles.layoutImage} source = {require('../images/gps2.png')}/>
              </View>
            ))}

            {/* show total scans on each point */}
            {pointScans.map((item, index) => (
              <View key={index} style={[{width: 20}, {height: 15}, {position: 'absolute'}, {top: adjustPoint(item.x, item.y).y - 10}, {left: adjustPoint(item.x, item.y).x - 1}]}>
                <Text style={[{fontSize: 10}, ]}>{item.scans}</Text> 
              </View>
            ))}
            
            {/* selected Pin in green */}
            <View style={[{width: 10}, {height: 10}, {position: 'absolute'}, {top: selectedPin.y-10}, {left: selectedPin.x-5}]}>
              <Image style={styles.layoutImage} source = {require('../images/gps2_green.png')}/>
            </View>
          </View>
        
          {/* Button to scan the Wifis */}
          <TouchableOpacity onPress={scanWifi} style={scanning? styles.disabled : styles.appButtonContainer} disabled={scanning}>
            <Text style={styles.appButtonText}>Scan Wifi</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

// var {height, width} = Dimensions.get('window');
const styles = StyleSheet.create({
  wrapperView: {
    flex:1,
    flexDirection:'column',
    alignItems:'center',
    justifyContent:'center'
  },

  gpsIcon: {
    width: 20,
    height: 20,
    position: 'absolute',
    top: 190,
    left: 290,
  },  
  imageContainer: {
    width: 360,
    height: 350,
    //borderWidth: 1,
    //borderColor: "#000",
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
    // textAlign: 'center'
  },
  appButtonContainer: {
    marginTop: 25,
    marginHorizontal: 80,
    elevation: 8,
    backgroundColor: "#902343",
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 12
  },
  disabled: {
    marginTop: 25,
    marginHorizontal: 80,
    elevation: 8,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "grey",
  },
  appButtonText: {
    fontSize: 18,
    color: "#fff",
    alignSelf: "center",
    letterSpacing: 2,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    backgroundColor: 'lightgray',
  },
});

export default Fingerprints;