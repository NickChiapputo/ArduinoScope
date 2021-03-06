/**** Macros to clear (cbi) and set (sbi) individual bits in registers. ****/
#ifndef cbi
#define cbi(sfr, bit) (_SFR_BYTE(sfr) &= ~_BV(bit))
#endif
#ifndef sbi
#define sbi(sfr, bit) (_SFR_BYTE(sfr) |= _BV(bit))
#endif

uint8_t toHex[] = { 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 65, 66, 67, 68, 69, 70 };

uint16_t logic;
uint8_t adcHigh = 0;
uint8_t dataReady = 0;

uint16_t output;


/**** Define channel select variables ****/
#define NUM_CHANNELS 2					// Constant number of channels to measure from.
uint8_t currentChannel = 0;				// Keep track of the current selected channel.


/**** Define Channel Input Pins ****/
#define CHANNEL_ONE_PIN 	A0
#define CHANNEL_TWO_PIN 	A1
#define CHANNEL_THREE_PIN 	A2
#define CHANNEL_FOUR_PIN 	A3
#define CHANNEL_FIVE_PIN 	A4
#define CHANNEL_SIX_PIN 	A5


/**** Define digital input pins ****/
#define CMASK	B00111100				// Select A2-A5 as digital input.
#define DMASK	B11111100				// Select pin 2-7 as digital input.
#define BMASK	B00111111				// Select pin 8-13 as digital input.


/**** Define ADC prescalar ****/
/****
	* 	Period/frequency calculations don't include setup time for conversions.
	* 	Prescalar;	Period;		Frequency (ideal);
	* 	  2			  1.625 us	615.385 kHz				(bad output)
	* 	  4			  3.25  us 	307.692 kHz				(bad output)
	* 	  8			  6.5   us 	153.846 kHz				
	* 	 16			 13     us 	 76.923 kHz
	* 	 32			 26     us 	 38.462 kHz
	* 	 64			 52     us 	 19.231 kHz
	* 	128			104     us 	  9.615 kHz
****/
#define ADC_PRESCALAR 64


/**** Define UART Baud Rate ****/
// #define UART_BAUDRATE	9600	// 9.6k
// #define UART_BAUDRATE  250000	// 250k
// #define UART_BAUDRATE  500000	// 500k
// #define UART_BAUDRATE 1000000	// 1M
#define UART_BAUDRATE 2000000	// 2M


void initADC()
{
	// Setup ADC registers.
	ADMUX = B01100000; // Set reference voltage to Vcc. Left adjust data. Initially set MUX to channel 0 (A0).


	// Setup the ADCSRA register.
	sbi( ADCSRA, ADEN );	// Enable ADC.
	sbi( ADCSRA, ADSC );	// Start Conversion.
	cbi( ADCSRA, ADATE );	// Disable Auto-Triggering.
	sbi( ADCSRA, ADIE );	// Enable ADC Interrupt.
	cbi( ADCSRA, ADPS2 );	// Clear ADC Prescalar bis.
	cbi( ADCSRA, ADPS1 );	// '' '' 
	cbi( ADCSRA, ADPS0 );	// '' ''

	cbi( ADCSRB, ACME  );	// Disable Analog Comparate Multiplexer.
	cbi( ADCSRB, ADTS2 );	// Set in Free Running Mode.
	cbi( ADCSRB, ADTS1 );	// '' ''
	cbi( ADCSRB, ADTS0 );	// '' ''
	ADCSRB = B00000000;						// Set in free running mode.


	// Set ADC Prescalar bits.
	#if ADC_PRESCALAR == 2		// 001
		sbi( ADCSRA, ADPS0 );
	#elif ADC_PRESCALAR == 4	// 010
		sbi( ADCSRA, ADPS1 );
	#elif ADC_PRESCALAR == 8	// 011
		sbi( ADCSRA, ADPS0 );
		sbi( ADCSRA, ADPS1 );
	#elif ADC_PRESCALAR == 16	// 100
		sbi( ADCSRA, ADPS2 );
	#elif ADC_PRESCALAR == 32	// 101
		sbi( ADCSRA, ADPS0 );
		sbi( ADCSRA, ADPS2 );
	#elif ADC_PRESCALAR == 64	// 110
		sbi( ADCSRA, ADPS1 );
		sbi( ADCSRA, ADPS2 );
	#else						// 111
		sbi( ADCSRA, ADPS0 );
		sbi( ADCSRA, ADPS1 );
		sbi( ADCSRA, ADPS2 );
	#endif
}


/****
	*	Set the direction of pins on the device.
	*	A value of '1' sets the pin as output.
	*	A value of '0' sets the pin as input.
	*	
	*	DDRC	Analog pins  A0-A5
	* 	DDRD	Digital pins 0-7
	*	DDRB	Digital pins 8-13
****/
void initPins()
{
	// Invert the masks to set input pins.
	// AND the inverted masks to preserve outputs.
	DDRC &= ~CMASK;	
	DDRD &= ~DMASK;
	DDRB &= ~BMASK;
}


void setup() 
{
	Serial.begin( UART_BAUDRATE );	// Intialize the serial communication.
	cli();							// Disable interrupts.
	initADC();						// Initialize the ADC.
	initPins();						// Initialize the digital pin inputs.
	sei();							// Enable interrupts.
}


void loop() 
{
	if( dataReady )
	{
		// Go to the next channel. If we are at
		// the last channel, then return to the first.
		currentChannel ^= 1;

		// Set the analog pin MUX.
		ADMUX ^= 1;

		// If we did not just sample the last channel,
		// display the space delimiter bewteen data.
		// Otherwise print newline to show end of data.
		if( currentChannel == 0 )
		{
			Serial.write( toHex[ ( output >> 12 ) & 0x000f ] );
			Serial.write( toHex[ ( output >>  8 ) & 0x000f ] );
			Serial.write( toHex[ ( output >>  4 ) & 0x000f ] );
			Serial.write( toHex[ ( output       ) & 0x000f ] );

			logic = 0;
	        logic |= (PINB & BMASK ) << 6;		//read digital pins 8-13
	        logic |= (PIND & DMASK ) >> 2;        //read digital pins 2-7 mask and shift then place
	        logic |= (PINC & CMASK ) << 10;      //read analog2-5 pins as logic input mask and shift then place
	
	        Serial.write( toHex[ ( logic >> 12 ) & 0x000f ] );	// PINC
	        Serial.write( toHex[ ( logic >>  8 ) & 0x000f ] );	// Top 4 of PIND
	        Serial.write( toHex[ ( logic >>  4 ) & 0x000f ] );	// Bottom 2 of PIND, Top 2 of PINB
	        Serial.write( toHex[ ( logic       ) & 0x000f ] );	// Bottom 4 of PINB

			Serial.write( 10 );
		}

		dataReady = 0;
		sbi( ADCSRA, ADSC );	// Start Conversion.
	}
}


ISR( ADC_vect )
{
	// Read from the ADC data register.
	// Reading from ADCH triggers next conversion.
	adcHigh = ADCH;

	if( currentChannel )
		output = ( output & 0xff00 ) | adcHigh;
	else
		output = adcHigh << 8;

	// Set the flag high to trigger output logging.
	dataReady = 1;
}

