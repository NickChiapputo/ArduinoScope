/**** Macros to clear (cbi) and set (sbi) individual bits in registers. ****/
#ifndef cbi
#define cbi(sfr, bit) (_SFR_BYTE(sfr) &= ~_BV(bit))
#endif
#ifndef sbi
#define sbi(sfr, bit) (_SFR_BYTE(sfr) |= _BV(bit))
#endif


/**** Define channel select variables ****/
#define NUM_CHANNELS 2					// Constant number of channels to measure from.
uint8_t currentChannel = 0;				// Keep track of the current selected channel.
uint8_t channels[] = 	{				// List of channel MUX values:
							B01100000, 		// A0
							B01100001		// A1
						};


/**** Define Channel Input Pins ****/
#define CHANNEL_ONE_PIN 	A0
#define CHANNEL_TWO_PIN 	A1
#define CHANNEL_THREE_PIN 	A2
#define CHANNEL_FOUR_PIN 	A3
#define CHANNEL_FIVE_PIN 	A4
#define CHANNEL_SIX_PIN 	A5


/**** Define ADC prescalar ****/
/****
	* 	Period/frequency calculations don't include setup time for conversions.
	* 	Prescalar;	Period;		Frequency (ideal);
	* 	  2			  1.625 us	615.385 kHz				(bad output)
	* 	  4			  3.25  us 	307.692 kHz				(bad output)
	* 	  8			  6.5   us 	153.846 kHz				(bad output)
	* 	 16			 13     us 	 76.923 kHz
	* 	 32			 26     us 	 38.462 kHz
	* 	 64			 52     us 	 19.231 kHz
	* 	128			104     us 	  9.615 kHz
****/
#define ADC_PRESCALAR 2


/**** Define Timer1 frequency ****/
/****
	*	OCR1A Value |	Period		| Frequency
	*	------------+---------------+-------------
	*		62500	|	250   ms	|	    4 Hz
	*		25000	|	100   ms	|	   10 Hz
	*		12500	|	 50   ms	|	   20 Hz
	*		 2500	|	 10   ms	|	  100 Hz
	*		  500	|	500   ms	|	  500 Hz
	*		  250	|	  1   ms	|	 1000 Hz
	*		  125	|	  0.5 ms	|	 5000 Hz
	*		   25	|	  0.1 ms	|	10000 Hz
****/
#define TIMER1_OUTPUTCOMPARE_A 250


/**** Define UART Baud Rate ****/
// #define UART_BAUDRATE  250000	// 250k
// #define UART_BAUDRATE  500000	// 500k
// #define UART_BAUDRATE 1000000		// 1M
#define UART_BAUDRATE 2000000		// 2M


void initADC()
{
	// Setup ADC registers.
	ADMUX = B01100000; // Set reference voltage to Vcc. Left adjust data. Initially set MUX to channel 0 (A0).


	// Setup the ADCSRA register.
	sbi( ADCSRA, ADEN );	// Enable ADC.
	sbi( ADCSRA, ADSC );	// Start Conversion.
	sbi( ADCSRA, ADATE );	// Enable Auto-Triggering.
	sbi( ADCSRA, ADIE );	// Enable ADC Interrupt.
	cbi( ADCSRA, ADPS2 );	// Clear ADC Prescalar bis.
	cbi( ADCSRA, ADPS1 );	// '' '' 
	cbi( ADCSRA, ADPS0 );	// '' ''

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


	// Disable digital input
	DIDR0 = B0011111;
}


void setup() 
{
	// Initialize the serial communication with baud rate 250000.
	Serial.begin( UART_BAUDRATE );

	cli();	// Disable interrupts.

	initADC();

	sei();	// Enable interrupts.
}


void loop() 
{
}


ISR( ADC_vect )
{
	// Go to the next channel. If we are at
	// the last channel, then return to the first.
	if( ++currentChannel == NUM_CHANNELS )
		currentChannel = 0;

	// Set the analog pin MUX.
	ADMUX = channels[ currentChannel ];


	// Read from the ADC data register.
	// Reading from ADCH triggers next conversion.
	// Print out the data in hex format.
	Serial.print( ADCH, HEX );


	// If we did not just sample the last channel,
	// display the space delimiter bewteen data.
	// Otherwise print newline to show end of data.
	if( currentChannel )
		Serial.print( " " );
	else
		Serial.print( "\n" );
}

