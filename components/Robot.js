import React, { Component } from "react";
// import { useNavigation } from '@react-navigation/native';
import { PermissionsAndroid } from 'react-native';
import WifiManager from "react-native-wifi-reborn";

import KeepAwake from 'react-native-keep-awake';
import Sound from 'react-native-sound';
Sound.setCategory('Playback');

import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  DeviceEventEmitter,
} from "react-native";
import { RNSerialport, definitions, actions } from "react-native-serialport";

import url from './globals';

class Robot extends Component {
  constructor(props) {
    super(props);

    this.state = {
      // for the serial connection
      servisStarted: false,
      connected: false,
      usbAttached: false,
      output: "",
      outputArray: [],
      line: "",
      baudRate: "9600",
      interface: "-1",
      sendText: "HELLO",
      returnedDataType: definitions.RETURNED_DATA_TYPES.HEXSTRING,
      
      // my variables
      showRoutes: false,
      showModes: false,
      showPointsOfRoute: false,
      showStartButton: false,
      showProgress: false,

      routes: [],
      selectedRoute: "2",
      selectedMode: "Scan All",
      selectedPoint: "4",
      timeBetweenStops: "100321",
      route_str: "2222222222222",
      skippedPoints: [],

      totalScans: 40,
      scansDone: 0,
      timeReached: "100321",

      wifis: [],
      scanning: false,
      timeToScan: 0,
    };

    this.startUsbListener = this.startUsbListener.bind(this);
    this.stopUsbListener = this.stopUsbListener.bind(this);
  }

  componentDidMount() {
    this.startUsbListener();
    this.getRoutes();
    // KeepAwake.activate();
  }

  componentWillUnmount() {
    this.stopUsbListener();
  }

  startUsbListener() {
    DeviceEventEmitter.addListener(actions.ON_SERVICE_STARTED, this.onServiceStarted, this);
    DeviceEventEmitter.addListener(actions.ON_SERVICE_STOPPED, this.onServiceStopped, this);
    DeviceEventEmitter.addListener(actions.ON_DEVICE_ATTACHED, this.onDeviceAttached, this);
    DeviceEventEmitter.addListener(actions.ON_DEVICE_DETACHED, this.onDeviceDetached, this);
    DeviceEventEmitter.addListener(actions.ON_ERROR, this.onError, this);
    DeviceEventEmitter.addListener(actions.ON_CONNECTED, this.onConnected, this);
    DeviceEventEmitter.addListener(actions.ON_DISCONNECTED, this.onDisconnected, this);
    DeviceEventEmitter.addListener(actions.ON_READ_DATA, this.onReadData, this);

    RNSerialport.setReturnedDataType(this.state.returnedDataType);
    RNSerialport.setAutoConnectBaudRate(parseInt(this.state.baudRate, 10));
    RNSerialport.setInterface(parseInt(this.state.interface, 10));
    RNSerialport.setAutoConnect(true);
    RNSerialport.startUsbService();
  };

  stopUsbListener = async () => {
    DeviceEventEmitter.removeAllListeners();
    const isOpen = await RNSerialport.isOpen();
    if (isOpen) {
      // Alert.alert("isOpen", isOpen);
      console.log('isOpen', isOpen);
      RNSerialport.disconnect();
    }
    RNSerialport.stopUsbService();
  };

  onServiceStarted(response) {
    this.setState({ servisStarted: true });
    if (response.deviceAttached) {
      this.onDeviceAttached();
    }
  }

  onServiceStopped() {
    this.setState({ servisStarted: false });
  }
  onDeviceAttached() {
    this.setState({ usbAttached: true });
  }
  onDeviceDetached() {
    this.setState({ usbAttached: false });
  }
  onConnected() {
    this.setState({ connected: true });
  }
  onDisconnected() {
    this.setState({ connected: false });
  }
  onReadData(data) {
    if (this.state.returnedDataType === definitions.RETURNED_DATA_TYPES.INTARRAY) {
        const payload = RNSerialport.intArrayToUtf16(data.payload);
        // console.log('got from arduino INT: ', payload);
        this.setState({ output: this.state.output + payload });
    } else if (this.state.returnedDataType === definitions.RETURNED_DATA_TYPES.HEXSTRING) {
        const payload = RNSerialport.hexToUtf16(data.payload);
        // console.log('got from arduino HEX: ', payload);
        this.setState({ output: this.state.output + payload });

        for (let i=0; i<payload.length; i++) {
            if (payload[i] != "\n") {
                this.setState({line: this.state.line + payload[i]});
            } else if (payload[i] == "\n") {
                this.recievedNewLine(this.state.line); // end previous line
                // console.log("new line");
            }
        }
    }
  }

  // ------------------------------------------- My functions -------------------------------------------------------- //
  playSound(filename) {
    var ding = new Sound(filename, Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.log('failed to load the sound', error);
        return;
      }
      // when loaded successfully
      console.log('duration in seconds: ' + ding.getDuration() + 'number of channels: ' + ding.getNumberOfChannels());
    
      ding.setVolume(1);
      ding.play(success => {
        if (success) {
          console.log('successfully finished playing');
        } else {
          console.log('playback failed due to audio decoding errors');
        }
        ding.release()
      });
    });
  }

  getRoutes() {
    fetch("http://" + url + ":8000/api/routes/")
    .then(resp => resp.json())
    .then(data => {
      //  console.log(data)
      this.setState({ routes: data })
      console.log("Got routes")
    })
    .catch(err => {
      console.log("Error Fetching data: ", err)
    })
  }

  async recievedNewLine(line) {
    line = line.trim();
    console.log(line);
    this.setState({line: ""})
    if (line == "ready") {
      this.sendToArduino("r");
    } else if (line.includes("Select route...")) { // from "Select route..."
      // show route selection
      this.setState({
        showRoutes: true,
        showModes: false,
        showPointsOfRoute: false,
        showStartButton: false
      })
      // this.sendToArduino("s2223f");
    } else if (line.includes("Select mode:")) { // from "Select mode:"
      // show mode selection
      this.setState({
        showRoutes: false,
        showModes: true,
        showPointsOfRoute: false,
        showStartButton: false
      })
      // this.sendToArduino("1");
    } else if (line.includes("Select start point")) {
      // select point of route
      this.setState({
        showRoutes: false,
        showModes: false,
        showPointsOfRoute: true,
        showStartButton: false
      })
      // this.sendToArduino("s1f");
    } else if (line == "start!") {
      this.setState({
        showRoutes: false,
        showModes: false,
        showPointsOfRoute: false,
        showStartButton: true
      })
    } else if (line == "Moving!") {
      this.playSound('beep.mp3')
    } else if (line == "Route Ended!") {
      this.playSound('finished.mp3')
    } else if (line.includes("Scanning!")) { // from "Scnanning!"
      // scan
      // then send 'g' to arduino
      // setTimeout(() => {this.sendToArduino('g')}, 3000);
      this.setState({scansDone:0});
      while (this.state.scansDone < this.state.totalScans) {
        await this.scanWifi();
        this.setState({scansDone: this.state.scansDone+1});
      }
      
      this.sendToArduino('g');
    } else if (line.includes("stop:")) { // from "stop:"
      // stopped at point
      let stopIndex = line.split(':')[1];
      stopIndex = stopIndex.replace(/\D/g,''); // remove all non-numeric characters from the string
      console.log("Stoped at:" + stopIndex);
      this.setState({
        selectedPoint: stopIndex,
        timeReached: new Date().toLocaleTimeString()
      });
      // send robot location to server
      let data = {
        "message": "NEW_ROBOT_LOCATION",
        "route": parseInt(this.state.selectedRoute),
        "point": parseInt(this.state.selectedPoint)
      }
      const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      };
      try {
        const fetchResponse = await fetch('http://'+url+':8000/1/fingerprinting/', requestOptions);
        const data = await fetchResponse.json();
        console.log(data);
      } catch (e) {
        console.log(e);
      }

    } else if (line.includes("skipped:")) { // from "skipped:"
      let skippedIndex = line.split(':')[1];
      skippedIndex = skippedIndex.replace(/\D/g,''); // remove all non-numeric characters from the string
      console.log("Skipped stop at:" + skippedIndex);
      let skipped = [];
      skipped = this.state.skippedPoints;
      skipped.push(skippedIndex);
      this.setState({skippedPoints: skipped});

    } else if (line.includes("time:")) { // from "time:"
      let stopTime = line.split(':')[1];
      stopTime = stopTime.replace(/\D/g,''); // remove all non-numeric characters from the string
      console.log("Time between stops:" + stopTime);
      this.setState({timeBetweenStops: stopTime});
    }
  }

  sendToArduino(text) {
    console.log("sending to arduino: " + text);
    RNSerialport.writeString(text + '\n');
  }

  async scanWifi() {
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
        this.setState({scanning: true});
        let start = new Date();
        let wifis = await WifiManager.reScanAndLoadWifiList();
        let end = new Date();
        var difference = end - start;
        this.setState({timeToScan: difference});
        this.setState({scanning: false});

        // console.log(wifis);
        this.setState({wifis: wifis});
        // send new point to server
        let data = {
          "message": "NEW_POINT",
          "route": parseInt(this.state.selectedRoute),
          "point": parseInt(this.state.selectedPoint),
          "wifis": wifis,
          "floor_plan_id": 1
        }
        const requestOptions = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        };
        try {
          const fetchResponse = await fetch('http://'+url+':8000/1/fingerprinting/', requestOptions);
          const data = await fetchResponse.json();
          console.log(data);
        } catch (e) {
          console.log(e);
        }

      } else {
        console.log('permition is not granted')
      }
  }

  convertRouteAndSend(routeIndex) {
    this.setState({selectedRoute: routeIndex});
    let route_str = "";
    let route = this.state.routes[routeIndex];
    let points = [];
    if (route != undefined) points = JSON.parse(route.points);
    // console.log(points);
    // 2 -> go staight
    // 1 -> right turn
    // 0 -> left turn
    // 3 -> final point
    // example 222210212122123
    route_str += "2";
    for (let i=1; i<points.length; i++) {
      if (i == points.length-1) {
        route_str += "3";
        break;
      }
      if (points[i-1].direction == points[i].direction) {
        route_str += "2"; // straigth
      } else if (points[i-1].direction == "east" && points[i].direction == "south" || points[i-1].direction == "west" && points[i].direction == "north" || points[i-1].direction == "north" && points[i].direction == "east" || points[i-1].direction == "south" && points[i].direction == "west") {
        route_str += "1"; // right
      } else {
        route_str += "0";
      } 
    }
    this.setState({route_str: route_str});
    route_str = "s" + route_str + "f";
    // console.log(route_str);
    this.sendToArduino(route_str);
  }

  onError(error) {
    console.error(error);
  }

  handleSendButton() {
    console.log("sending to arduino: " + this.state.sendText);
    RNSerialport.writeString(this.state.sendText + '\n');
  }

  handleClearButton() {
    this.setState({ output: "" });
    this.setState({ outputArray: [] });
  }

  buttonStyle = status => {
    return status
      ? styles.button
      : Object.assign({}, styles.button, { backgroundColor: "#C0C0C0" });
  };

  render() {
    // const { navigation } = this.props;
    let options; 
    let title;
    if (this.state.showRoutes) {
      title = <Text style={styles.title}>Select Route</Text>
      options = this.state.routes.map((item, index) => {
        return (
          <TouchableOpacity key={index.toString()} style={styles.button} onPress={() => this.convertRouteAndSend(index)}>
            <Text key={index.toString()} style={styles.buttonText}>
              {index}
            </Text>
          </TouchableOpacity>
        ) 
      })
    } else if (this.state.showModes) {
      title = <Text style={styles.title}>Select Mode</Text>
      let modes = ['Scan All', 'Scan Single', 'Test drive'];
      options = modes.map((item, index) => {
        return (
          <TouchableOpacity key={item} style={styles.button} onPress={() => {
                                                                            this.sendToArduino(index)
                                                                            this.setState({selectedMode: item})
                                                                          }
                                                                      }>
            <Text key={item} style={styles.buttonText}>
              {item}
            </Text>
          </TouchableOpacity>
        )
      })
    } else if (this.state.showPointsOfRoute) {
      title = <Text style={styles.title}>Select Point of route: {this.state.selectedRoute}</Text>
      let route = this.state.routes[parseInt(this.state.selectedRoute)];
      // console.log(route);
      let points = [];
      if (route != undefined) points = JSON.parse(route.points);
      // console.log(points);
      options = points.map((item, index) => {
        return (
          <TouchableOpacity key={index.toString()} style={styles.button} onPress={() => {
                                                                                          this.sendToArduino("s"+index+"f")
                                                                                          this.setState({selectedPoint: index})
                                                                                        }
                                                                                  }>
            <Text key={index.toString()} style={styles.buttonText}>
              {index}
            </Text>
          </TouchableOpacity>
        )
      })
    } else if (this.state.showStartButton) {
      options = <TouchableOpacity style={styles.button} onPress={() => {
                                                                          this.sendToArduino('s');
                                                                          this.setState({showStartButton:false, showProgress:true})
                                                                        }
                                                                }>
                  <Text style={styles.buttonText}>START</Text>
                </TouchableOpacity>

    } else if (this.state.showProgress) {
      title = <View>
              <Text style={[styles.title, {textAlign: 'center'}]}>{this.state.selectedMode} progress...</Text>
              <Text style={[styles.title, {marginTop:0, textAlign: 'center'}]}>Route: {this.state.selectedRoute}</Text>
            </View>
              
      let stop_type = "";
      if (this.state.route_str.charAt(this.state.selectedPoint) == "2") {
        stop_type = "Straight stop";
      } else if (this.state.route_str.charAt(this.state.selectedPoint) == "1") {
        stop_type = "Right stop";
      } else if (this.state.route_str.charAt(this.state.selectedPoint) == "0") {
        stop_type = "Left stop";
      } else if (this.state.route_str.charAt(this.state.selectedPoint) == "3") {
        stop_type = "Final stop";
      }
      options = 
        <View style={{margin: 5}}>
          <View style={[styles.progressInfo, {backgroundColor: "#d6e2ff"}]}>
            <Text style={[styles.progressText ,{fontSize: 23, fontWeight: "600"}]}>p: {this.state.selectedPoint} / {this.state.route_str.length -1}</Text>
          </View>
          <View style={[styles.progressInfo, {backgroundColor: "#ffdfbf"}]}>
            <Text style={styles.progressText}>{stop_type}</Text>
          </View>
          <View style={[styles.progressInfo, {backgroundColor: "#d6e2ff"}]}>
            <Text style={styles.progressText}>Scans: {this.state.scansDone} / {this.state.totalScans}</Text>
          </View>
          <View style={[styles.progressInfo, {backgroundColor: "#ffdfbf"}]}>
            <Text style={styles.progressText}>time to stop: {this.state.timeBetweenStops}</Text>
          </View>
          <View style={[styles.progressInfo, {backgroundColor: "#d6e2ff"}]}>
            <Text style={styles.progressText}>stopped at: {this.state.timeReached}</Text>
          </View>
          <View style={[styles.progressInfo, {backgroundColor: "#ffdfbf"}]}>
            <Text style={styles.progressText}>skipped: {this.state.skippedPoints.join('-')}</Text>
          </View>
        </View>
    }
    
    // ---------------------------------------------- Return of render function ------------------------------------------------ //
    return (
      
      <View style={styles.container}>
        <KeepAwake />
        <View style={{flex:2}}>
          <ScrollView
            ref={ref => {this.scrollView = ref}}
            onContentSizeChange={() => this.scrollView.scrollToEnd({animated: false})}
            style={styles.output} 
            nestedScrollEnabled={true}
          >
            <Text style={styles.full}>
              {this.state.output === "" ? "No Content" : this.state.output}
            </Text>
          </ScrollView>
        </View>
        
        <View>
          {title}
        </View>
        <View style={{flex:5}}>
          <ScrollView>
            {options}
          </ScrollView>
        </View>
        {/* <View>
          <TouchableOpacity style={styles.button} onPress={() => this.playSound('')}>
              <Text style={styles.buttonText}>Play sound</Text>
            </TouchableOpacity>
        </View> */}
      </View>
      
    );
  }
}

const styles = StyleSheet.create({
  container: {
    // display: "flex",
    flex: 1,
    flexDirection: "column",
    paddingTop: 20,
    paddingLeft: 16,
    paddingRight: 16
  },
  
  line: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap"
  },
  line2: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  title: {
    letterSpacing: 2,
    marginTop: 15,
    fontSize: 25,
    fontWeight: "500"
  },
  progressInfo: {
    padding: 10
  },
  progressText: {
    fontSize: 20,
    textAlign: 'center'
  },
  value: {
    marginLeft: 20
  },
  output: {
    marginTop: 10,
    height: 50,
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    // height: 200
  },
  inputContainer: {
    marginTop: 10,
    borderBottomWidth: 2
  },
  textInput: {
    paddingLeft: 10,
    paddingRight: 10,
    height: 40
  },
  button: {
    minWidth: 80,
    marginTop: 12,
    marginBottom: 12,
    marginRight: 12,
    paddingLeft: 15,
    paddingRight: 15,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#147efb",
    borderRadius: 3
  },
  buttonText: {
    color: "#FFFFFF"
  }
});

export default Robot;