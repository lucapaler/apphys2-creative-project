import React, { useEffect, useRef, useState } from 'react';
import {
  View, useWindowDimensions, Text, SafeAreaView,
} from 'react-native';

import { Entypo } from '@expo/vector-icons';
import { DeviceMotion } from 'expo-sensors';
import Slider from '@react-native-community/slider';

// dimensions of my phone (iPhone X)
const screenWidthMeters = 0.0709;
const screenHeightMeters = 0.1436;

const phoneArea = screenWidthMeters * screenHeightMeters;

export default function App() {
  const [theta, setTheta] = useState(0); // angle of phone incident to magnetic field pointed at you
  const [fieldStrength, setFieldStrength] = useState(1); // strength of field controlled by slider
  const [phi, setPhi] = useState(0); // calculated magnetic flux
  const [emf, setEmf] = useState(0); // calculated induced emf
  const [prevPhi, setPrevPhi] = useState(0); // previous magnetic flux from 1 second ago (used for emf)

  const { height, width } = useWindowDimensions();

  const outOfScreen = theta >= 80; // angle threshold for displaying O instead of arrow
  const intoScreen = theta <= -80; // angle threshold for displaying X instead of arrow

  // calculated height of arrows to show perspective
  const arrowHeight = intoScreen || outOfScreen
    ? 40
    : (Math.abs(90 - theta) / 90) * 40;

  // function to calculate flux from radian angle measure
  const calculateFlux = (B, A, rads) => B * A * Math.cos(((rads - 90) * Math.PI) / 180);

  // calculated flux anytime fieldStrength or theta is updated
  useEffect(() => {
    setPhi(calculateFlux(fieldStrength, phoneArea, theta));
  }, [fieldStrength, theta]);

  // function to calculate emf
  const calculateEmf = () => {
    const deltaPhi = phi - prevPhi;
    const deltaT = 1;

    setEmf(-1 * 10 * (deltaPhi / deltaT));

    setPrevPhi(phi);
  };

  // helper function which creates a timer to repeatedly call the calculateEmf function
  const useInterval = (callback, delay) => {
    const savedCallback = useRef();

    useEffect(() => {
      savedCallback.current = callback;
    });

    useEffect(() => {
      const tick = () => {
        savedCallback.current();
      };

      const interval = setInterval(tick, delay);
      return () => clearInterval(interval);
    }, [delay]);
  };

  // starts timer to calculate emf every 1000 ms
  useInterval(calculateEmf, 1000);

  // runs on app launch
  useEffect(() => {
    let subscriber = null;

    // checks to see if phone supports gyroscope sensor
    DeviceMotion.isAvailableAsync()
      .then((isAvailable) => {
        if (isAvailable) {
          DeviceMotion.setUpdateInterval(500);

          // sets new theta value every time new orientation data is received from the phone
          subscriber = DeviceMotion.addListener((data) => {
            const angle = (data.rotation.beta * 180) / Math.PI;

            // only calculate if difference is at least 1 degree (to improve performance)
            if (Math.abs(theta - angle) >= 1) {
              setTheta(angle);
            }
          });
        }
      });

    return () => {
      if (subscriber) {
        subscriber.remove();
      }
    };
  }, []);

  // app design and UI
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center' }}>
      <Text style={{ marginHorizontal: 15, textAlign: 'center' }}>
        Your device edges represent a (10-loop) coil of wire in a magnetic field pointed at your
        body.
        {'\n'}
        Rotating your phone about the imaginary x-axis, marked in black, will change the magnetic
        flux.
      </Text>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          {emf > 0 && (
            <Entypo
              name="arrow-long-left"
              size={20}
              color="red"
            />
          )}
          <Text style={{ fontSize: 18, marginRight: 10 }}>
            {`ℰ = ${emf.toFixed(5)} V`}
          </Text>
          {emf < 0 && (
            <Entypo
              name="arrow-long-right"
              size={20}
              color="red"
            />
          )}
        </View>
        <View style={{
          borderRadius: 15,
          borderWidth: 7,
          borderColor: '#db8b67',
          marginHorizontal: 5,
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        >
          {new Array(50).fill(0).map((_, index) => (index % 2 === 0 ? (
            <View
              key={index}
              style={{
                height: (intoScreen || outOfScreen) ? 20 : arrowHeight,
                marginVertical: (intoScreen || outOfScreen) ? 10 : (40 - arrowHeight) / 2,
                overflow: 'hidden',
                marginHorizontal: (intoScreen || outOfScreen) ? 10 : undefined,
                paddingHorizontal: 15,
                opacity: fieldStrength / 10,
              }}
            >
              <Entypo
                name={outOfScreen
                  ? 'circle'
                  : intoScreen
                    ? 'circle-with-cross'
                    : 'arrow-long-down'}
                size={outOfScreen || intoScreen ? 20 : 40}
                color="blue"
              />
            </View>
          ) : <View key={index} style={{ width: 60 }} />))}
        </View>
      </View>
      <Slider
        minimumValue={0}
        maximumValue={10}
        step={0.5}
        value={1}
        onValueChange={(newFieldStrength) => {
          setFieldStrength(newFieldStrength);
        }}
        style={{
          marginHorizontal: 20,
        }}
      />
      <Text style={{ fontWeight: '500', textAlign: 'center' }}>
        {`${fieldStrength} T`}
      </Text>
      <Text style={{
        backgroundColor: 'white',
        color: 'black',
        fontSize: 30,
        textAlign: 'center',
        marginTop: 25,
      }}
      >
        Φ =
        {` ${phi.toFixed(5)} Wb`}
      </Text>
      {/* SECTION - x-axis marker */}
      <View style={{
        backgroundColor: 'black',
        height: 4,
        position: 'absolute',
        top: height / 2 + 3,
        width,
      }}
      />
      <Text style={{
        position: 'absolute',
        color: 'black',
        fontSize: 20,
        top: height / 2,
        right: 10,
      }}
      >
        x
      </Text>
      {/* !SECTION */}
    </SafeAreaView>
  );
}
