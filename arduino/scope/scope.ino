uint16_t channelOneVal = 0;			// Variable used to store value read from channel one input.
float channelOneVoltage = 0.0;		// Voltage calculation from channel one input.

uint16_t channelTwoVal = 0;			// Variable used to store value read from channel two input.
float channelTwoVoltage = 0.0;		// Voltage calculation from channel two input.


#ifndef cbi
#define cbi(sfr, bit) (_SFR_BYTE(sfr) &= ~_BV(bit))
#endif
#ifndef sbi
#define sbi(sfr, bit) (_SFR_BYTE(sfr) |= _BV(bit))
#endif


#define A0_SELECT B00000001
#define A1_SELECT B00000010
#define A2_SELECT B00000100
#define A3_SELECT B00001000
#define A4_SELECT B00010000
#define A5_SELECT B00100000
uint8_t channelSelect = A0_SELECT | A2_SELECT | A4_SELECT;
uint8_t currentChannel = 0;
uint8_t numChannels = 6;
uint8_t channels[] = 	{
							B01100000, 		// A0
							B01100001,		// A1
							B01100010, 		// A2
							B01100011,		// A3
							B01100100,		// A4
							B01100101 		// A5
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
#define ADC_PRESCALAR 16


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
	// ADMUX  = B01000000; // Set reference voltage to Vcc. Right adjust data. Initially set MUX to channel 0 (A0).
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


void initTimer1()
{
	// Set up the Timer2 timer.
	TIMSK1 = (TIMSK1 & B11111000) | B00000010;	// Enable output compare A match interrupt.
	TCCR1A = (TCCR1A & B11111100) | B00000000;
	TCCR1B = (TCCR1B & B11100000) | B00001011;	// Set the clock divisor to 64 (011). Run at 16 MHz / 64 = 250 kHz

   	// Set capture/compare register value for Timer1A
	OCR1A = TIMER1_OUTPUTCOMPARE_A;
}


void setup() {
	// Initialize the serial communication with baud rate 250000.
	Serial.begin( UART_BAUDRATE );

	cli();	// Disable interrupts.


	initADC();


	// initTimer1();


	sei();	// Enable interrupts.
}

void loop() 
{
}


ISR( ADC_vect )
{
	if( ++currentChannel == numChannels )
	{
		currentChannel = 0;
	}

	// Set the analog pin MUX.
	ADMUX = channels[ currentChannel ];

	// Read from the ADC data register.
	// Reading from ADCH triggers next conversion.
	// uint8_t res = ADCH;
	Serial.print( ADCH, HEX );

	if( currentChannel )
	{
		Serial.print( " " );
		ADCSRA |= bit (ADSC);
	}
	else
	{
		Serial.print( "\n" );

		// if( ++outputCount < maxOutput )
		// {
		// 	ADCSRA |= bit (ADSC);
		// }
	}


	// If not in free-running mode,
	// set the ADSC bit to start 
	// the next conversion.
	// ADCSRA |= bit (ADSC);
}

