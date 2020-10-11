uint8_t channelOnePin = A0;			// Analog 0 pin for the first channel.
uint16_t channelOneVal = 0;			// Variable used to store value read from channel one input.
float channelOneVoltage = 0.0;		// Voltage calculation from channel one input.

uint8_t channelTwoPin = A1;			// Analog 1 pin for the second channel.
uint16_t channelTwoVal = 0;			// Variable used to store value read from channel two input.
float channelTwoVoltage = 0.0;		// Voltage calculation from channel two input.

uint16_t sampleFreq = 1000; 			// How many times to sample the channels per second.
uint16_t outputFreq = 10;			// How many times to send the updated data through the Serial connection per second.


uint8_t ledPin = 7;
uint8_t ledState = 0;
uint8_t updateLED = 0;
uint16_t TCNT;
unsigned long timeDiff;
uint16_t count = 0;

void setup() {
	// Initialize the serial communication with baud rate 250000.
	Serial.begin( 250000 );

	// Set digital pin 7 as output for LED.
	pinMode( ledPin, OUTPUT );
	digitalWrite( ledPin, LOW );

	cli();	// Disable interrupts.

	// Set up the Timer2 timer.
	TIMSK1 = (TIMSK1 & B11111000) | 0x06;	// Enable timer comparison interrupt for A.
   	TCCR1A = (TCCR1A & B11111100) | 0x00;
   	TCCR1B = (TCCR1B & B11100000) | B00001011;	// Set the clock divisor to 64 (011). Run at 16 MHz / 64 = 250 kHz

   	// Compare value to 0x07D0 = 250. 250 kHz / 250 = 1 kHz sampling rate. 
   	// 250 kHz / 250 = 1 kHz sampling rate.
   	// Max value is 2^16 - 1 = 65,535
	// OCR1AH = 0x07;
	// OCR1AL = 0xD0;
//	OCR1A = 62500;	// 250 ms,	4 Hz
	OCR1A = 25000;	// 100 ms,	10 Hz
//	OCR1A = 12500;	// 50 ms,	20 Hz
//	OCR1A = 2500;	// 10 ms,	100 Hz
//	OCR1A = 250;	// 1 ms,	1000 Hz

	sei();	// Enable interrupts.
}

void loop() {
	// Update the LED if the ISR was just executed.
	if( updateLED )
	{
		updateLED = 0;										// Reset the interrupt flag.

		ledState = !ledState;								// Switch the LED state.
		digitalWrite( ledPin, ledState ? HIGH : LOW );		// Change the LED output.

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

// Timer Comparison A ISR
ISR( TIMER1_COMPA_vect )
{
	updateLED = 1;
}

// Timer Comparison B ISR
ISR( TIMER1_COMPB_vect )
{
	TCNT = ( TCNT1H & 0x1100 ) | ( TCNT1L & 0x0011 );
}
