import React from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity } from 'react-native';

const HomeScreen = ({navigation}) => {

  return (
    <View>

      <TouchableOpacity onPress={() => navigation.navigate('LiveNav')} style={styles.appButtonContainer}>
        <Text style={styles.appButtonText}>Live Navigation</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Fingerprints')} style={styles.appButtonContainer}>
        <Text style={styles.appButtonText}>Edit Fingerprints</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Robot')} style={styles.appButtonContainer}>
        <Text style={styles.appButtonText}>Robot</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Wifi')} style={styles.appButtonContainer}>
        <Text style={styles.appButtonText}>Wifi Scan</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Serial')} style={styles.appButtonContainer}>
        <Text style={styles.appButtonText}>Serial Com</Text>
      </TouchableOpacity>

    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    height: 60,
    padding: 15,
    backgroundColor: 'darkslateblue'
  },
  text: {
    color: '#fff',
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
    fontWeight: "bold",
    alignSelf: "center",
    // textTransform: "uppercase"
  }
});

export default HomeScreen;