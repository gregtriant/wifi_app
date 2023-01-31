
import React, { Component } from 'react';
import {Image as RNimage} from 'react-native'
import { 
  View, 
  Text, 
  StyleSheet,
  TouchableOpacity,
  SafeAreaView, ScrollView,
} from 'react-native';
import Canvas, {Image as CanvasImage} from 'react-native-canvas';

import { PermissionsAndroid } from 'react-native';
import WifiManager from "react-native-wifi-reborn";
import imagePng from '../images/Floor_Layout.png'
import url from './globals';

const imageUri = RNimage.resolveAssetSource(imagePng).uri
const canvasWidth = 360;
const canvasHeight = 350;

class LiveNavigation extends Component {
	constructor (props) {
		super(props);
		// Constant declarations
    
		this.state = {
		image: null,
				canvas: null,
				
				rooms: [],
				scanning: false
		};
  	}
	componentDidMount = async () => {
		try{
			const fetchResponse = await fetch("http://" + url + ":8000/api/rooms?floor_plan_id=1");
			const room_data = await fetchResponse.json();
			console.log("got rooms");
			this.setState({
				rooms: [...room_data]
			})
		} catch (e) {
			console.log('Error while getting rooms:', e);
		}
    console.log("LiveNavigation Component Mounted")
  }

  handleCanvas = (canvas) => {
		if (!canvas) return;
		this.setState({
			canvas: canvas
		})
		canvas.width = canvasWidth;
		canvas.height = canvasHeight;
    
		const ctx = canvas.getContext('2d');
		
		// console.log(canvas.width, canvas.height);
		if (this.state.image == null) {
			const image = new CanvasImage(canvas);
			image.src = imageUri
			image.addEventListener('load', () => {
				ctx.drawImage(image, 0, 0, canvas.width, canvas.height); 
			})
			this.setState({
				image: image
			})
		} else {

		}
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
      // if (isNaN(selectedPoint) || isNaN(selectedRoute)) {
      //   console.log("no point selected, cant do scan")
      //   return;
      // }
      console.log('scanning')
      // setScanning(true);
			this.setState({scanning: true})
      let start = new Date();
      let wifis = await WifiManager.reScanAndLoadWifiList();
      let end = new Date();
      let difference = end - start;
			console.log('time to scan:', difference);
			// console.log(wifis);
			
			let pointAlgo = "linear_svm";
			let roomAlgo = "MLP";
			let point_wifiData = {
				"algorithm": pointAlgo,
				"networks": [
						{"BSSID": "78:96:82:3a:9d:c8", "level": -42},
						{"BSSID": "28:ff:3e:03:76:dc", "level": -62},
						{"BSSID": "62:ff:3e:03:76:dd", "level": -65},
						{"BSSID": "f4:23:9c:20:9a:06", "level": -75},
						{"BSSID": "0c:b9:12:03:c4:20", "level": -82},
						{"BSSID": "08:26:97:e4:4f:51", "level": -83},
						{"BSSID": "50:78:b3:80:c4:bd", "level": -86},
						{"BSSID": "5a:d4:58:f2:8e:64", "level": -87},
						{"BSSID": "78:96:82:2f:ef:4e", "level": -88},
						{"BSSID": "62:96:82:2f:ef:4f", "level": -89},
						{"BSSID": "34:58:40:e6:60:c0", "level": -92},
						{"BSSID": "50:81:40:15:41:e8", "level": -95}
				]
			}
			if (wifis[0].capabilities) point_wifiData.networks = wifis;
      let room_wifiData = {...point_wifiData}; // copy the data
			room_wifiData.algorithm = roomAlgo;
      try {
				// find point Prediction
        const point_fetchResponse = await fetch("http://" +url+ ":8000/localize/point/1/", {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(point_wifiData)
				});
        const point_data = await point_fetchResponse.json();
        console.log(point_data);
				
				// find room Prediction
				const room_fetchResponse = await fetch("http://" +url+ ":8000/localize/room/1/", {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(room_wifiData)
				});
        const room_data = await room_fetchResponse.json();
        console.log(room_data);
				this.setState({scanning: false});
				
				// draw image on top
				const ctx = this.state.canvas.getContext('2d');
				ctx.drawImage(this.state.image, 0, 0, canvasWidth, canvasHeight); 

				// draw room
				let room = room_data.room_pred;
				for (let i=0; i<this.state.rooms.length; i++) {
					if (this.state.rooms[i].name == room) {
						let x = Math.floor(this.state.rooms[i].x * canvasWidth);
						let y = Math.floor(this.state.rooms[i].y * canvasHeight);
						let w = Math.floor(this.state.rooms[i].width * canvasWidth);
						let h = Math.floor(this.state.rooms[i].height * canvasHeight);
						console.log(room, x, y, w, h);
						const ctx = this.state.canvas.getContext('2d');
						ctx.beginPath();
						ctx.lineWidth = "2";
						ctx.strokeStyle = "#32cd32"; // green
						ctx.rect(x, y, w, h);
						ctx.stroke();
						break;
					}
				}

				// draw circle point
				let pointX = Math.floor(point_data.x * canvasWidth);
				let pointY = Math.floor(point_data.y * canvasHeight);
				ctx.beginPath();
				ctx.strokeStyle = "#56a6f0"; // blue
				ctx.arc(pointX, pointY, 50, 0, 2 * Math.PI);
				ctx.stroke();

				// draw point
				ctx.beginPath();
				ctx.arc(pointX, pointY, 4, 0, 2 * Math.PI);
				ctx.fillStyle = 'black';
				ctx.fill();
				ctx.lineWidth = 1;
				ctx.strokeStyle = 'black';
				ctx.stroke();


      } catch (e) {
        console.log(e);
        this.setState({scanning: false})
      }

    } else {
      console.log('permition is not granted')
    }
  }

  render() {
    return (
			<SafeAreaView style={styles.container}>
				<ScrollView style={styles.scrollView}>
					<View style={styles.canvasView}>
						<Canvas ref={this.handleCanvas} style={{ width: 360, height: 350, backgroundColor: 'black' }}/>
					</View>
					
					<TouchableOpacity onPress={this.scanWifi} style={this.state.scanning? styles.disabled : styles.appButtonContainer} disabled={this.state.scanning}>
						<Text style={styles.appButtonText}>Scan Wifi</Text>
					</TouchableOpacity>
				</ScrollView>
			</SafeAreaView>
    )
  }
}

const styles = StyleSheet.create({
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
    borderWidth: 1,
    borderColor: "#000",
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
    // fontWeight: "bold",
    alignSelf: "center",
    letterSpacing: 2,
    // textTransform: "uppercase"
  },
  container: {
    flex: 1,
		flexDirection:'row',
  },
  scrollView: {
    backgroundColor: 'lightgray',
  },
	canvasView: {
		marginTop: 20,
		flex: 1,
		flexDirection:'column',
		alignItems:'center',
		justifyContent:'center'
	}
});

export default LiveNavigation;

// import React, { useRef, useEffect } from 'react';
// import { SafeAreaView, Alert } from 'react-native';
// import Canvas, { Image } from 'react-native-canvas';

// export default function LiveNav() {
//   const canvasRef = useRef(null);

//   useEffect(() => {
//     if (canvasRef.current) {
//       // const ctx = canvasRef.current.getContext('2d');
//       // ctx.fillStyle = 'red';
//       // ctx.fillRect(20, 20, 100, 100);

// 			// const ctx = ref.current.getContext('2d');
// 			const ctx = canvasRef.current.getContext('2d');
//       // ctx.beginPath();
//       // ctx.arc(100, 100, 40, 0, 2 * Math.PI);
//       // ctx.closePath();
//       // ctx.fillStyle = 'blue';
//       // ctx.fill();
// 			// const image = new CanvasImage(canvasRef);
// 			const height = 360;
// 			const width = 350;
// 			const image = new Image(Canvas, height, width);
// 			image.src = 'https://upload.wikimedia.org/wikipedia/commons/6/63/Biho_Takashi._Bat_Before_the_Moon%2C_ca._1910.jpg';
//     	image.addEventListener('load', () => {
// 				ctx.drawImage(image, 0, 0, 100, 100);
//     	});
// 		//   if (ctx) {
// 		//     Alert.alert('Canvas is ready');
// 		//   }
//     }
//   }, [canvasRef]);

//   return (
//     <SafeAreaView style={{ flex: 1 }}>
//       <Canvas ref={canvasRef} style={{ width: 360, height: 350, backgroundColor: 'black' }} />
//     </SafeAreaView>
//   );
// }