unsigned long lastCheck;			// Last time the time was checked.
unsigned long checkPeriod = 1;		// How long to go between activations in ms.

uint8_t channelOnePin = A0;			// Analog 0 pin for the first channel.
uint16_t channelOneVal = 0;			// Variable used to store value read from channel one input.
float channelOneVoltage = 0.0;		// Voltage calculation from channel one input.

uint8_t channelTwoPin = A1;			// Analog 1 pin for the second channel.
uint16_t channelTwoVal = 0;			// Variable used to store value read from channel two input.
float channelTwoVoltage = 0.0;		// Voltage calculation from channel two input.

void setup() {
	// Initialize the serial communication with baud rate 250000.
	Serial.begin( 250000 );
	
	// Get the starting time.
	lastCheck = millis();
}

void loop() {
	// If checkPeriod milliseconds have elapsed since the last check.
	if( ( millis() - lastCheck ) >= checkPeriod )
	{
		unsigned long timeElapsed = millis() - lastCheck;
		lastCheck = millis();								// Update the last check time.

		channelOneVal = analogRead( channelOnePin );		// Read the first channel input.
		channelOneVoltage = channelOneVal * ( 5.0 / 1023 );	// Convert the [0, 1023] range into a floating point voltage.

		Serial.print( channelOneVoltage );					// Tell the world what we're reading.
		Serial.print( " " );

		channelTwoVal = analogRead( channelTwoPin );		// Read the second channel input.
		channelTwoVoltage = channelTwoVal * ( 5.0 / 1023 );	// Convert the [0, 1023] range into a floating point voltage.
		
		Serial.print( channelTwoVoltage );
		Serial.println( "" );
	}
}
