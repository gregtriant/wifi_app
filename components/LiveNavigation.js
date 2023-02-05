
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

import CompassHeading from 'react-native-compass-heading';
import { PermissionsAndroid } from 'react-native';
import WifiManager from "react-native-wifi-reborn";
import imagePng from '../images/Floor_Layout.png'
import {url} from './globals';
import {testScans} from './globals';

const imageUri = RNimage.resolveAssetSource(imagePng).uri
const canvasWidth = 360;
const canvasHeight = 350;

class LiveNavigation extends Component {
	constructor (props) {
		super(props);
		// Constant declarations
    
		this.state = {
			drawPoints: false,
			testing: false,
			roomAlgo: "linear_svm",
			pointAlgo: "linear_svm",
			testScanIndex: 0,
			
			image: null,
			canvas: null,
			ctx: null,
			heading: 0,
			headingOffset: 344,
			direction: 0,
			rooms: [],
			scanning: false,
			touchPos: {x:0,y:0},
			selectedPoint: {x: 0,y: 0},
			predictedPoint: {x:0,y:0},
			error: 0,
			predictedRoom: {room: '', x:0, y:0, w:0, h:0},
			pointScans: [], // all points on map
			points: [], // points visited
			availablePoints: [] // points that are inside reach
		};
	}
	componentDidMount = async () => {

		try{
			// get rooms
			const fetchResponse = await fetch("http://" + url + ":8000/api/rooms?floor_plan_id=1"); 
			const room_data = await fetchResponse.json();
			console.log("got rooms");
			this.setState({
				rooms: [...room_data]
			})
		} catch (e) {
			console.log('Error while getting rooms:', e);
		}
    	console.log("LiveNavigation Component Mounted");

		// get points
		this.getPointScans();

		// start Compass
		// const degree_update_rate = 3;

    // CompassHeading.start(degree_update_rate, ({heading, accuracy}) => {
    //   // console.log('CompassHeading: ', heading, accuracy);
		// 	heading = 360 - heading;
		// 	let direction = (heading + this.state.headingOffset) % 360;
		// 	this.setState({
		// 		heading: heading,
		// 		direction: direction
		// 	})
		// 	// this.drawHeading(direction);
    // });

  }

	componentWillUnmount = () => {
		// CompassHeading.stop();
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
				image: image,
				ctx: ctx,
			})
		} else {

		}
  }
	
	testWifi = async () => {
		let wifis = testScans[this.state.testScanIndex];
		console.log("TestScan:", this.state.testScanIndex, "/", testScans.length);
		this.setState({
			testScanIndex: this.state.testScanIndex +1
		})
		// console.log(wifis);
		this.findRoomAndPointPred(wifis, this.state.roomAlgo, this.state.pointAlgo);
		
	}

	findRoomAndPointPred = async (wifis, room_algo, point_algo) => {
		try {
			// find point Prediction
			const point_fetchResponse = await fetch("http://" + url + ":8000/localize/point/1/", {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(
					{
						algorithm: point_algo,
						networks: wifis
					}
				)
			});
			let point_data = await point_fetchResponse.json();
			point_data.x = Math.floor(point_data.x * canvasWidth);
			point_data.y = Math.floor(point_data.y * canvasHeight);
			let error_dist = Math.sqrt((point_data.x - this.state.selectedPoint.x)*(point_data.x - this.state.selectedPoint.x) + (point_data.y - this.state.selectedPoint.y)*(point_data.y - this.state.selectedPoint.y));
			
			this.setState({
				error: error_dist.toFixed(2),
				predictedPoint:{
					x:point_data.x, y:point_data.y
				}
			})
			console.log(point_data);
			// find room Prediction
			const room_fetchResponse = await fetch("http://" +url+ ":8000/localize/room/1/", {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					algorithm: room_algo,
					networks: wifis
				})
			});
			const room_data = await room_fetchResponse.json();

			// find room
			let room = room_data.room_pred;
			for (let i=0; i<this.state.rooms.length; i++) {
				if (this.state.rooms[i].name == room) {
					let x = Math.floor(this.state.rooms[i].x * canvasWidth);
					let y = Math.floor(this.state.rooms[i].y * canvasHeight);
					let w = Math.floor(this.state.rooms[i].width * canvasWidth);
					let h = Math.floor(this.state.rooms[i].height * canvasHeight);
					console.log("Room_pred:", room, x, y, w, h);
					this.setState({
						predictedRoom: {
							room:room,
							x:x,
							y:y,
							w:w,
							h:h
						}
					}, () => {this.drawAll()})
					break;
				}
			}
			
		} catch (e) {
			console.log(e);
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
      
      console.log('scanning')
      // setScanning(true);
			this.setState({scanning: true})
      let start = new Date();
      let wifis = await WifiManager.reScanAndLoadWifiList();
      let end = new Date();
      let difference = end - start;
			console.log('time to scan:', difference);
			// console.log(wifis);
			this.setState({scanning: false})
			
			if (wifis.length < 3) {  // if we dont get a real scan we chose the first test scan
				console.log("Using Test Scan!!")
				wifis = testScans[0];
			}
			
      this.findRoomAndPointPred(wifis, this.state.roomAlgo, this.state.pointAlgo);	

    } else {
      console.log('permition is not granted')
    }
  }

	drawAll() {
		
		console.log("selected:", this.state.selectedPoint);
		console.log("predicted:",this.state.predictedPoint);
		console.log("room:",this.state.predictedRoom);

		// draw image on top
		const ctx = this.state.ctx;
		ctx.drawImage(this.state.image, 0, 0, canvasWidth, canvasHeight);

		// draw room
		ctx.lineWidth = "2";
		ctx.beginPath();
		ctx.strokeStyle = "#32cd32"; // green
		ctx.rect(this.state.predictedRoom.x, this.state.predictedRoom.y, this.state.predictedRoom.w, this.state.predictedRoom.h);
		ctx.stroke();
		// draw room text
		ctx.font = "12px Arial";
		ctx.fillText(this.state.predictedRoom.room, this.state.predictedRoom.x + 4, this.state.predictedRoom.y + 11);

		// draw circle
		let circleRadious = 2 * 36; // 36 pixesl -> 1 m
		ctx.beginPath();
		ctx.strokeStyle = "#56a6f0"; // blue
		ctx.arc(this.state.predictedPoint.x, this.state.predictedPoint.y, circleRadious, 0, 2 * Math.PI);
		ctx.stroke();

		// draw predicted point
		this.drawPoint(this.state.predictedPoint.x, this.state.predictedPoint.y, 4, 'blue');

		// draw selected Point
		this.drawPoint(this.state.selectedPoint.x, this.state.selectedPoint.y, 4, 'black');

		// draw a line to indicate error
		ctx.lineWidth = 1;
		ctx.strokeStyle = "red";
		ctx.beginPath();
		ctx.moveTo(this.state.predictedPoint.x, this.state.predictedPoint.y);
		ctx.lineTo(this.state.selectedPoint.x, this.state.selectedPoint.y);
		ctx.stroke();
	}

	getPointScans = () => {
    console.log("getting total scans of each point from:" + "http://"+ url +":8000/1/point_scans/");
    fetch("http://"+ url +":8000/1/point_scans/")
    .then(resp => resp.json())
    .then(data => {
      // console.log(data)
			for(let i=0; i< data.length; i++) {
				data[i].x = Math.floor(data[i].x * canvasWidth);
				data[i].y = Math.floor(data[i].y * canvasHeight);
			}
			this.setState({
				pointScans: data
			})
    })
    .catch(err => {
      console.log("Error Fetching data: ", err)
    })
  }

	drawHeading(direction) {
		// console.log("heading:",this.state.heading);
		if (this.state.selectedPoint.x == 0 || this.state.heading == null) {
			console.log("No points or no heading! Cant draw heading on map...");
			return;
		}

		// draw image on top
		const ctx = this.state.ctx;
		ctx.drawImage(this.state.image, 0, 0, canvasWidth, canvasHeight); 
		
		let x1 = this.state.selectedPoint.x;
		let y1 = this.state.selectedPoint.y;
		let lineDist = 50;
		
		// draw all the lines
		let pointForward = this.drawLine(x1, y1, lineDist, direction, 'green');
		let pointUp = this.drawLine(x1, y1, 100, direction + 45, 'black');
		let pointDown = this.drawLine(x1, y1, 100, direction - 45, 'black');
		// console.log(pointForward)
		// console.log(pointUp)
		// console.log(pointDown)
		// draw the selected Point
		this.drawPoint(this.state.selectedPoint.x, this.state.selectedPoint.y, 4, 'green');
		let pointCenter = {
			x: x1 - Math.floor(canvasWidth/2),
			y: Math.floor(canvasHeight/2) - y1
		}
		// console.log(pointCenter)
		this.drawAllPoints(pointUp, pointDown, pointCenter);
	}

	drawAllPoints = (pointUp, pointDown, pointCenter) => { // the coordinates of the points are with center origin
		let allPoints = this.state.pointScans;
		let availablePoints = [];
		let farAwayPoints = [];
		let currentPoint = this.state.selectedPoint;
		const ctx = this.state.ctx;
		ctx.lineWidth = 1;
		ctx.strokeStyle = 'green';
		ctx.beginPath();
		
		for (let i=0; i<allPoints.length; i++) {
			let new_point = { // point with center_coordinates
				x: allPoints[i].x - Math.floor(canvasWidth/2),
				y: canvasHeight - allPoints[i].y - Math.floor(canvasHeight/2)
			}
			let result2 = this.isLeft(pointDown, pointCenter, new_point);
			let result3 = this.isLeft(pointUp, pointCenter, new_point);
			if (!result2 & result3) { // if point is inbetween the lines
				let dist = Math.sqrt((currentPoint.x - allPoints[i].x)*(currentPoint.x - allPoints[i].x) + (currentPoint.y - allPoints[i].y)*(currentPoint.y - allPoints[i].y));
				// console.log(dist)
				if (dist > 108) { // 3 meters // 36 pix -> 1m
					farAwayPoints.push(allPoints[i]);
				} else {
					if(this.state.drawPoints) ctx.rect(allPoints[i].x-1, allPoints[i].y-1, 2, 2);
					availablePoints.push(allPoints[i]);
				}
			} else {
				// ctx.rect(allPoints[i].x-1, allPoints[i].y-1, 2, 2);
				// this.drawPoint(allPoints[i].x, allPoints[i].y, 4, 'black');
			}
		}
		ctx.stroke();

		this.setState({
			availablePoints: availablePoints
		})
		if (this.state.drawPoints) {
			ctx.lineWidth = 1;
			ctx.strokeStyle = 'red';
			ctx.beginPath();
			for(let i=0; i<farAwayPoints.length; i++) {
				ctx.rect(farAwayPoints[i].x-1, farAwayPoints[i].y-1, 2, 2);
			}
			ctx.stroke();
		}
		
	}

	drawLine = (x1, y1, lineDist, direction, color) => { // direction is an angle: [0,360) in degrees
		let direction_rad = direction * (Math.PI / 180);
		
		let x1_center = x1 - Math.floor(canvasWidth/2);
		let y1_bot = canvasHeight - y1;
		let y1_center = y1_bot - Math.floor(canvasHeight/2);

		let x2_center = lineDist * Math.cos(direction_rad); // with origin on the center of canvas
		let y2_center = lineDist * Math.sin(direction_rad);

		x2_center = x1_center + x2_center; // with origin as the x1,y1 point
		y2_center = y1_center + y2_center;

		let x2_bot = x2_center + Math.floor(canvasWidth/2);
		let y2_bot = y2_center + Math.floor(canvasHeight/2);
		let x2_top = x2_bot;
		let y2_top = canvasHeight - y2_bot;

		const ctx = this.state.ctx;
		ctx.strokeStyle = color;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2_top, y2_top);
		ctx.stroke();

		return {x:x2_center, y:y2_center}
	}

	drawPoint = (x, y, radius, color) => {
		const ctx = this.state.ctx;
		ctx.beginPath();
		ctx.arc(x, y, radius, 0, 2 * Math.PI);
		ctx.fillStyle = color;
		ctx.fill();
		ctx.lineWidth = 1;
		ctx.strokeStyle = color;
		ctx.stroke();
	}

	isLeft = (point1, point2, point3) => { // test if point3 ist on the left of point1 and point2 line
		return ((point2.x - point1.x)*(point3.y - point1.y) - (point2.y - point1.y)*(point3.x - point1.x)) > 0;
	}

	handlePress = (evt) => {
    // console.log(evt.nativeEvent)
    let x = Math.floor(evt.nativeEvent.locationX); //locationX
    let y = Math.floor(evt.nativeEvent.locationY); //locationY To avoid the overlay of other icons on top of the floorplan layout
    // console.log("x:" + x + ", y:" + y);
    this.setState({
			touchPos:{
				x: x,
				y: y
			}
		})
    // find the closest point to the press
    var minDist = 2000000;
    var index = 0;
    if (this.state.pointScans.length == 0) {
      return
    };

    for (let i=0; i<this.state.pointScans.length; i++) {
      let point = this.state.pointScans[i];
      let point_x = point.x;
      let point_y = point.y;
      let dist = Math.sqrt((x-point_x)*(x-point_x) + (y-point_y)*(y-point_y));
      if (dist < minDist) {
        minDist = dist;
        index = i;
      }
    }
    
    // console.log("dist:", minDist, "i:", index, "x:", this.state.pointScans[index].x, "y:", this.state.pointScans[index].y);
    this.setState({
			selectedPoint: {
				x: this.state.pointScans[index].x,
				y: this.state.pointScans[index].y
			}
		}, () => {
			// console.log(this.state.selectedPoint);
			// redraw image to clear
			const ctx = this.state.ctx;
			ctx.drawImage(this.state.image, 0, 0, canvasWidth, canvasHeight);
			this.drawPoint(this.state.selectedPoint.x, this.state.selectedPoint.y, 4, 'black')
		})
  }

  render() {
		const testing = this.state.testing;
    let button;
    if (testing) {
			button = 
      <TouchableOpacity onPress={this.testWifi} style={styles.appButtonContainer}>
				<Text style={styles.appButtonText}>Test Wifi</Text>
			</TouchableOpacity>
    } else {
			button = 
      <TouchableOpacity onPress={this.scanWifi} style={this.state.scanning? styles.disabled : styles.appButtonContainer} disabled={this.state.scanning}>
				<Text style={styles.appButtonText}>Scan Wifi</Text>
			</TouchableOpacity>
    }

    return (
			<SafeAreaView style={styles.container}>
				<ScrollView style={styles.scrollView}>
          <Text style={styles.text}>Selected: x: {this.state.selectedPoint.x}, y: {this.state.selectedPoint.y}</Text>
					<Text style={styles.text}>Predicted: x: {this.state.predictedPoint.x}, y: {this.state.predictedPoint.y}</Text>
					<Text style={styles.text}>Error: {this.state.error}, {(this.state.error/36).toFixed(1)} m</Text>
					{/* <Text style={styles.text}>heading: {this.state.heading}</Text>
					<Text style={styles.text}>direction: {this.state.direction}</Text> */}
					<View style={styles.wrapperView} >
						<View style={styles.canvasView} onTouchStart={(e) => this.handlePress(e)}>
							<Canvas ref={this.handleCanvas} style={{ width: 360, height: 350, backgroundColor: 'black' }}/>
						</View>
					</View>
					
					{button}
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
	wrapperView: {
		marginTop: 20,
		flex: 1,
		flexDirection:'column',
		alignItems:'center',
		justifyContent:'center',
	},

	canvasView: {
		// borderWidth: 1,
    // borderColor: "#000",
	}
});

export default LiveNavigation;