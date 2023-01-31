import React from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity } from 'react-native';

const HomeScreen = ({navigation}) => {

  return (
    <View style={styles.wrapper}>

      <TouchableOpacity onPress={() => navigation.navigate('LiveNav')} style={styles.appButtonContainer}>
        <Text style={styles.appButtonText}>Live Navigation</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Fingerprints')} style={styles.appButtonContainer}>
        <Text style={styles.appButtonText}>Add Fingerprints</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Robot')} style={styles.appButtonContainer}>
        <Text style={styles.appButtonText}>Robot</Text>
      </TouchableOpacity>

      {/* <TouchableOpacity onPress={() => navigation.navigate('Location')} style={styles.appButtonContainer}>
        <Text style={styles.appButtonText}>Location IMU</Text>
      </TouchableOpacity> */}

      <TouchableOpacity onPress={() => navigation.navigate('Wifi')} style={styles.appButtonContainer}>
        <Text style={styles.appButtonText}>Wifi Scan</Text>
      </TouchableOpacity>

      {/* <TouchableOpacity onPress={() => navigation.navigate('Serial')} style={styles.appButtonContainer}>
        <Text style={styles.appButtonText}>Serial Com</Text>
      </TouchableOpacity> */}

    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
		flexDirection:'column',
    paddingTop: 25
  },
  appButtonContainer: {
    marginTop: 30,
    marginHorizontal: 80,
    elevation: 8,
    backgroundColor: "#902343",
    borderRadius: 10,
    paddingVertical: 20,
    paddingHorizontal: 14
  },
  appButtonText: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "bold",
    alignSelf: "center",
  }
});

export default HomeScreen;