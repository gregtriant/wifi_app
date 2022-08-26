import React, {useState} from 'react';
import { PermissionsAndroid } from 'react-native';
import WifiManager from "react-native-wifi-reborn";
import { TouchableOpacity, View, StyleSheet, FlatList, Button, Text } from 'react-native';
// import { TouchableOpacity, View, StyleSheet, FlatList, Text } from 'react-native';

const WifiScan = (props) => {
  const [wifis, setWifis] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [timeToScan, setTimeToScan] = useState(0);
  
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
        console.log(wifis);
        setWifis(wifis);

      } else {
        console.log('permition is not granted')
      }
  }
  
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={scanWifi} style={styles.appButtonContainer}>
        <Text style={styles.appButtonText}>Scan Wifi</Text>
      </TouchableOpacity>
      
      {
        (scanning) 
          ? 
          <Text style={styles.item}>Scanning Wifis...</Text>
          : 
          <View>
            <Text style={styles.time}>Scan took: {timeToScan} ms</Text>
            <FlatList
              data={wifis}
              renderItem={ ({item}) => 
                <View>
                  <Text style={styles.item}>{item.BSSID}</Text>
                  <Text style={styles.item}>{item.SSID}, {item.level}</Text>
                </View>
              }
            />
        </View>
      }
    </View>
  )
}
 
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  item: {
    padding: 10,
    fontSize: 18,
    height: 44,
  },
  time: {
    padding: 10,
    fontSize: 20,
    fontWeight: '800',
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
    fontWeight: "bold",
    alignSelf: "center",
    textTransform: "uppercase"
  }
});

export default WifiScan;