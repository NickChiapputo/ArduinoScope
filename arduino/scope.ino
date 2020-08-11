unsigned long lastCheck;			// Last time the time was checked.
unsigned long checkPeriod = 35;		// How long to go between activations in ms.

uint8_t pot0Pin = A0;				// Analog 0 pin for the potentiometer
uint16_t pot0Val = 0;				// Variable used to store value read from potentiometer input.
float pot0Voltage = 0.0;			// Voltage calculation from potentiometer input.

void setup() {
	// Initialize the serial communication with baud rate 115200.
	Serial.begin( 115200 );
	
	// Get the starting time.
	lastCheck = millis();
}

void loop() {
	// If checkPeriod milliseconds have elapsed since the last check.
	if( ( millis() - lastCheck ) > checkPeriod )
	{
		lastCheck = millis();					// Update the last check time.

		pot0Val = analogRead( pot0Pin );		// Read the potentiometer input.
		pot0Voltage = pot0Val * ( 5.0 / 1023 );	// Convert the [0, 1023] range into a floating point voltage.

		Serial.println( pot0Voltage );			// Tell the world what we're reading.
	}
}
