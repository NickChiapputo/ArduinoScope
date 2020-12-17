// Using the anonymous function reduces the memory usage significantly.
(function(window){
const cereal = navigator.serial;


// Create global variables.
// Connect Button.
var connectBtn;


// Port Information
var connected 	= false,
	port 		= undefined,
	inputDone 	= undefined, 
	inputStream = undefined, 
	reader 		= undefined;


// Logging Output
var bufferDataArea 	= undefined, 
	plotDataArea 	= undefined, 
	channelDataArea = undefined;


// Analytics Tracking
var startTime				= undefined, 
	elapsedTime				= 0,
	numDataPointsCollected 	= 0,
	collectionCount 		= 0, 
	collectionCountBuffer 	= 5;	// Ignore the first 5 data point collections when testing the start time.


// Plotting
var intervalID 			= undefined,			// Handlers for setting intervals.
	intervalIDDigital 	= undefined,
	intervalIDChannelData = undefined,
	interval 			= 40,					// Interval time in ms.
	intervalDigital 	= 1000,
	intervalChannelData = 100,
	xMin 				= 0,					// Minimum and maximum for x-axis for analog and digital.
	xMax 				= 10000,
	xMinDigital 		= xMin,
	xMaxDigital 		= xMax,
	maxVals 			= xMax + 1,				// Number of values in data array. Add +1 to show the last tick value
	maxValsDigital 		= maxVals,
	xLow 				= 0,					// Current minimum and maximum for x-axis set by sliders.
	xHigh 				= maxVals - 1,
	xLowDigital 		= xLow,
	xHighDigital 		= xHigh,
	yHigh 				= 5,					// Current minimum and maximum for y-axis set by sliders.
	yLow 				= 0,
	yHighDigital 		= 1.3,
	yLowDigital 		= 0,
	xrange 				= [ xLow, xHigh ],		// X and Y ranges for analog and digital plots.
	yrange 				= [ yLow, yHigh ],
	xrangeDigital		= xrange,
	yrangeDigital		= yrange;


// Data Recording
var	conversionFlag 		= true,
	index 				= 0,
	indexDigital 		= index,
	numAnalogChannels 	= 2,
	numDigitalChannels	= 16,
	analogData 			= [],
	digitalData			= [];


var analogScope, digitalScope;

var updateLayoutFlag = true;


// Sound Output
var	leftChannelOn 		= true,
	rightChannelOn 		= true,
	gainL 				= undefined,
	gainR 				= undefined;

// Left
var audioCtxLeft 		= undefined, 
	oscillatorLeft 		= undefined,
	splitterLeft 		= undefined,
	mergerLeft 			= undefined,
	soundPlayingLeft	= false;

// Right
var audioCtxRight 		= undefined, 
	oscillatorRight 	= undefined,
	splitterRight 		= undefined,
	mergerRight 		= undefined,
	soundPlayingRight	= false;


// Freeze/Unfreeze Plotting
var frozenAnalog = false,
	frozenDigital = false;


window.addEventListener( "load", async ( event ) => {
	// Create output logging area.
	channelDataArea = document.getElementById( "channelDataArea" );


	// Check if we're in a browser that supports the Serial API.
	if( "serial" in navigator )
	{
		channelDataArea.value = "Serial API found!";
	}
	else
	{
		channelDataArea.value = "Serial API not found!";
		connectBtn.onclick = () => { channelDataArea.value = "Can't connect to serial ports. Serial API not found."; };
		return;
	}


	// Create connect to device button.
	connectBtn = document.getElementById( "deviceConnect" );
	connectBtn.onclick = connect;


	// Create sound output options.
	createSoundEvents();


	// Create freeze/unfreeze options.
	createFreezeEvents();


	// Create plot control events.
	createPlotControlEvents();



	initPlots();
} );


function createSoundEvents()
{
	let playSoundBtnLeft 			= document.getElementById( "playSoundLeft" );
	let frequencyChangeSliderLeft 	= document.getElementById( "frequencyChangeSliderLeft" );
	let frequencyChangeInputLeft 	= document.getElementById( "frequencyChangeInputLeft" );
	let soundSelectLeft 			= document.getElementById( "soundSelectLeft" );
	let leftChannelSelectLeft 		= document.getElementById( "leftChannelSelectLeft" );
	let rightChannelSelectLeft 		= document.getElementById( "rightChannelSelectLeft" );

	// Add event listeners to sound options.
	playSoundBtnLeft.addEventListener( "click", () => { playSound( playSoundBtnLeft, false ); } );

	frequencyChangeSliderLeft.addEventListener( "input", () => { changeFrequency( frequencyChangeSliderLeft.value, false ); } );
	
	frequencyChangeInputLeft.addEventListener( "change", () => { changeFrequency( Math.log10( frequencyChangeInputLeft.value ), false ) } );
	
	soundSelectLeft.addEventListener( "change", () => { changeSoundType( soundSelectLeft.options[ soundSelectLeft.selectedIndex ].value, false ); } );

	// Set default frequency.
	frequencyChangeInputLeft.value = 440;
	frequencyChangeSliderLeft.value = Math.log10( frequencyChangeInputLeft.value );


	let playSoundBtnRight 			= document.getElementById( "playSoundRight" );
	let frequencyChangeSliderRight 	= document.getElementById( "frequencyChangeSliderRight" );
	let frequencyChangeInputRight 	= document.getElementById( "frequencyChangeInputRight" );
	let soundSelectRight 			= document.getElementById( "soundSelectRight" );
	let leftChannelSelectRight 		= document.getElementById( "leftChannelSelectRight" );
	let rightChannelSelectRight 	= document.getElementById( "rightChannelSelectRight" );

	// Add event listeners to sound options.
	playSoundBtnRight.addEventListener( "click", () => { playSound( playSoundBtnRight, 1 ); } );

	frequencyChangeSliderRight.addEventListener( "input", () => { changeFrequency( frequencyChangeSliderRight.value, true ); } );
	
	frequencyChangeInputRight.addEventListener( "change", () => { changeFrequency( Math.log10( frequencyChangeInputRight.value ), true ) } );
	
	soundSelectRight.addEventListener( "change", () => { changeSoundType( soundSelectRight.options[ soundSelectRight.selectedIndex ].value, true ); } );
	
	// Set default frequency.
	frequencyChangeInputRight.value = 440;
	frequencyChangeSliderRight.value = Math.log10( frequencyChangeInputRight.value );
}


function createFreezeEvents()
{
	let freezeAnalogBtn = document.getElementById( "freezeAnalogBtn" );
	let freezeBtnDigital = document.getElementById( "freezeDigitalBtn" );
	let freezeBtnBothAnalog = document.getElementById( "freezeBothBtnAnalog" );
	let freezeBtnBothDigital = document.getElementById( "freezeBothBtnDigital" );

	// Add frozen event listeners.
	freezeAnalogBtn.addEventListener( "click", () => {
		// Flip the frozen status.
		frozenAnalog = !frozenAnalog;

		// Change the button text based on status.
		if( frozenAnalog )
		{
			freezeAnalogBtn.value = "Unfreeze Analog";

			if( frozenDigital )
			{
				freezeBtnBothDigital.value = "Unfreeze Both";
				freezeBtnBothAnalog.value = "Unfreeze Both";
			}
		}
		else 
		{
			freezeAnalogBtn.value = "Freeze Analog";
			freezeBtnBothDigital.value = "Freeze Both";
			freezeBtnBothAnalog.value = "Freeze Both";
		}

		// Update the plot one more time before we stop.
		plotAnalogPoints();
	} );

	freezeBtnDigital.addEventListener( "click", () => {
		// Flip the frozen status.
		frozenDigital = !frozenDigital;

		// Change the button text based on status.
		if( frozenDigital )
		{
			freezeDigitalBtn.value = "Unfreeze Digital";

			if( frozenAnalog )
			{
				freezeBtnBothDigital.value = "Unfreeze Both";
				freezeBtnBothAnalog.value = "Unfreeze Both";
			}
		}
		else 
		{
			freezeBtnDigital.value = "Freeze Digital";
			freezeBtnBothDigital.value = "Freeze Both";
			freezeBtnBothAnalog.value = "Freeze Both";
		}

		// Update the plot one more time before we stop.
		plotDigitalPoints();
	} );

	freezeBtnBothAnalog.addEventListener( "click", () => {
		// Flip the frozen status.
		if( !frozenDigital || !frozenAnalog )
		{
			frozenDigital = true;
			frozenAnalog = true;

			freezeBtnDigital.value = "Unfreeze Digital";
			freezeAnalogBtn.value = "Unfreeze Analog";
			freezeBtnBothDigital.value = "Unfreeze Both";
			freezeBtnBothAnalog.value = "Unfreeze Both";
		}
		else // equivalent to if( frozenDigital && frozenAnalog )
		{
			console.log( "Unfreeze Both -- Analog" );
			frozenDigital = false;
			frozenAnalog = false;

			freezeBtnDigital.value = "Freeze Digital";
			freezeAnalogBtn.value = "Freeze Analog";
			freezeBtnBothDigital.value = "Freeze Both";
			freezeBtnBothAnalog.value = "Freeze Both";
		}

		// Update the plot one more time before we stop.
		plotDigitalPoints();
		plotAnalogPoints();
	} );

	freezeBtnBothDigital.addEventListener( "click", () => {
		// Flip the frozen status.
		if( !frozenDigital || !frozenAnalog )
		{
			frozenDigital = true;
			frozenAnalog = true;

			freezeBtnDigital.value = "Unfreeze Digital";
			freezeAnalogBtn.value = "Unfreeze Analog";
			freezeBtnBothDigital.value = "Unfreeze Both";
			freezeBtnBothAnalog.value = "Unfreeze Both";
		}
		else // equivalent to if( frozenDigital && frozenAnalog )
		{
			frozenDigital = false;
			frozenAnalog = false;

			freezeBtnDigital.value = "Freeze Digital";
			freezeAnalogBtn.value = "Freeze Analog";
			freezeBtnBothDigital.value = "Freeze Both";
			freezeBtnBothAnalog.value = "Freeze Both";
		}

		// Update the plot one more time before we stop.
		plotDigitalPoints();
		plotAnalogPoints();
	} );
}


function createPlotControlEvents()
{
	let lowInput = document.getElementById( "low" );
	let highInput = document.getElementById( "high" );
	let lowInputArea = document.getElementById( "lowVal" );
	let highInputArea = document.getElementById( "highVal" );
	lowInput.min = xLow;
	lowInput.max = xHigh;
	lowInput.value = xLow;
	lowInputArea.value = xLow.toLocaleString( undefined, { maximumFractionDigits: 0 } );
	lowInput.addEventListener( "input", () => 
		{
			let low = parseInt( lowInput.value ),
				high = parseInt( highInput.value );

			if( low < xMin )
			{
				lowInput.value = 0;
				low = 0;
			}

			if( low >= xMax )
			{
				low = xMax - 1;
				lowInput.value = low;
			}

			if( low > high )
			{
				highInput.value = low + 1;
				xHigh = low + 1;
				highInputArea.value = xHigh.toLocaleString( undefined, { maximumFractionDigits: 0 } );
			}

			xLow = low;
			maxVals = xHigh - xLow + 1;
			updateLayoutFlag = true;
			lowInputArea.value = xLow.toLocaleString( undefined, { minimumFractionDigits: 0 } );

			updatePlotLayout();
		} 
	);

	highInput.min = xLow;
	highInput.max = xHigh;
	highInput.value = xHigh;
	highInput.max = xMax;
	highInputArea.value = xHigh.toLocaleString( undefined, { maximumFractionDigits: 0 } );
	highInput.addEventListener( "input", () => 
		{
			let low = parseInt( lowInput.value ),
				high = parseInt( highInput.value );

			if( high > xMax )
			{
				high = xMax;
				highInput.value = high;
			}

			if( high <= xMin )
			{
				high = xMin + 1;
				highInput.value = high;
			}

			if( high < low )
			{
				lowInput.value = high - 1;
				xLow = high - 1;
				lowInputArea.value = xLow.toLocaleString( undefined, { minimumFractionDigits: 0 } );
			}

			xHigh = high;
			maxVals = xHigh - xLow + 1;
			updateLayoutFlag = true;
			highInputArea.value = xHigh.toLocaleString( undefined, { minimumFractionDigits: 0 } );

			updatePlotLayout();
		}
	);


	let lowInputDigital = document.getElementById( "lowDigital" );
	let highInputDigital = document.getElementById( "highDigital" );
	let lowInputDigitalArea = document.getElementById( "lowValDigital" );
	let highInputDigitalArea = document.getElementById( "highValDigital" );
	lowInputDigital.min = xLowDigital;
	lowInputDigital.max = xHighDigital;
	lowInputDigital.value = xLowDigital;
	lowInputDigitalArea.value = xLow.toLocaleString( undefined, { maximumFractionDigits: 0 } );
	lowInputDigital.addEventListener( "input", () => 
		{
			let low = parseInt( lowInputDigital.value ),
				high = parseInt( highInputDigital.value );

			if( low < xMinDigital )
			{
				lowInputDigital.value = 0;
				low = 0;
			}

			if( low >= xMaxDigital )
			{
				low = xMaxDigital - 1;
				lowInputDigital.value = low;
			}

			if( low > high )
			{
				highInputDigital.value = low + 1;
				xHighDigital = low + 1;
				highInputDigitalArea.value = xHighDigital.toLocaleString( undefined, { maximumFractionDigits: 0 } );
			}

			xLowDigital = low;
			maxValsDigital = xHighDigital - xLowDigital + 1;
			updateLayoutFlag = true;
			lowInputDigitalArea.value = xLowDigital.toLocaleString( undefined, { minimumFractionDigits: 0 } );

			updatePlotLayout();
		} 
	);

	highInputDigital.min = xLowDigital;
	highInputDigital.max = xHighDigital;
	highInputDigital.value = xHighDigital;
	highInputDigital.max = xMaxDigital;
	highInputDigitalArea.value = xHighDigital.toLocaleString( undefined, { maximumFractionDigits: 0 } );
	highInputDigital.addEventListener( "input", () => 
		{
			let low = parseInt( lowInputDigital.value ),
				high = parseInt( highInputDigital.value );

			if( high > xMaxDigital )
			{
				high = xMaxDigital;
				highInputDigital.value = high;
			}

			if( high <= xMinDigital )
			{
				high = xMinDigital + 1;
				highInputDigital.value = high;
			}

			if( high < low )
			{
				lowInputDigital.value = high - 1;
				xLowDigital = high - 1;
				lowInputDigitalArea.value = xLowDigital.toLocaleString( undefined, { minimumFractionDigits: 0 } );
			}

			xHighDigital = high;
			maxValsDigital = xHighDigital - xLowDigital + 1;
			updateLayoutFlag = true;
			highInputDigitalArea.value = xHighDigital.toLocaleString( undefined, { minimumFractionDigits: 0 } );

			updatePlotLayout();
		}
	);
}


function changeSoundType( type, isRight )
{
	if( isRight && oscillatorRight !== undefined )
		oscillatorRight.type = type;
	else if( !isRight && oscillatorLeft !== undefined )
		oscillatorLeft.type = type;
}


function playSound( playSoundBtn, isRight )
{
	if( soundPlayingLeft && !isRight )
	{
		oscillatorLeft.stop();
		soundPlayingLeft = false;
		playSoundBtn.value = "Play";
	}
	else if( soundPlayingRight && isRight )
	{
		oscillatorRight.stop();
		soundPlayingRight = false;
		playSoundBtn.value = "Play";
	}
	else
	{
		if( !isRight )
		{
			audioCtxLeft = new AudioContext();
			oscillatorLeft = audioCtxLeft.createOscillator();
			splitterLeft = audioCtxLeft.createChannelSplitter( 2 );
			oscillatorLeft.connect( splitterLeft );
			mergerLeft = audioCtxLeft.createChannelMerger( 2 );

			// Reduce volume of right channel.
			gainL = audioCtxLeft.createGain();
			// gainL.gain.setValueAtTime( 1, audioCtxLeft.currentTime );
			// splitterLeft.connect( gainL, 0 );

			// Send gain from output 0 (only one output of gain node)
			// to input 0 of merger (left channel).
			gainL.connect( mergerLeft, 0, 0 );
			splitterLeft.connect( mergerLeft, 0, 0 );

			// Connect merger output to the output of the audio context.
			mergerLeft.connect( audioCtxLeft.destination );


			// Get waveform shape selection and set oscillator waveform.
			let soundSelect = document.getElementById( "soundSelectLeft" );
			oscillatorLeft.type = soundSelect.options[ soundSelect.selectedIndex ].value;

			// Get waveform frequency and set oscillator frequency.
			oscillatorLeft.frequency.setValueAtTime(Math.pow( 10, document.getElementById( "frequencyChangeSliderLeft" ).value ), audioCtxLeft.currentTime); // value in hertz
			oscillatorLeft.start();

			soundPlayingLeft = true;
		}
		else
		{
			audioCtxRight = new AudioContext();

			oscillatorRight = audioCtxRight.createOscillator();

			splitterRight = audioCtxRight.createChannelSplitter( 2 );

			oscillatorRight.connect( splitterRight );

			mergerRight = audioCtxRight.createChannelMerger( 2 );


			// Reduce volume of left channel.
			gainR = audioCtxRight.createGain();

			// Send gain from output 0 (only one output of gain node)
			// to input 1 of merger (left channel).
			gainR.connect( mergerRight, 0, 1 );

			// Connect second output of splitter to second merger input.
			splitterRight.connect( mergerRight, 0, 1 );

			// Connect merger output to the output of the audio context.
			mergerRight.connect( audioCtxRight.destination );


			// Get waveform shape selection and set oscillator waveform.
			let soundSelect = document.getElementById( "soundSelectRight" );
			oscillatorRight.type = soundSelect.options[ soundSelect.selectedIndex ].value;

			// Get waveform frequency and set oscillator frequency.
			oscillatorRight.frequency.setValueAtTime(Math.pow( 10, document.getElementById( "frequencyChangeSliderRight" ).value ), audioCtxRight.currentTime); // value in hertz
			oscillatorRight.start();

			soundPlayingRight = true;
		}

		// Change the play button to the stop button.
		playSoundBtn.value = "Stop"; // ⏸︎
	}
}


// Expect `f` to be log_10 of desired frequency.
function changeFrequency( f, isRight )
{
	let newFreq = Math.pow( 10, f );
	
	if( isRight )
	{
		if( oscillatorRight !== undefined )
			oscillatorRight.frequency.setValueAtTime( newFreq, audioCtxRight.currentTime );
		document.getElementById( "frequencyChangeInputRight" ).value = newFreq.toFixed( 2 ).replace(/(\.0*|(?<=(\..*))0*)$/, '');
		document.getElementById( "frequencyChangeSliderRight" ).value = f;
	}
	else
	{
		if( oscillatorLeft !== undefined )
			oscillatorLeft.frequency.setValueAtTime( newFreq, audioCtxLeft.currentTime );
		document.getElementById( "frequencyChangeInputLeft" ).value = newFreq.toFixed( 2 ).replace(/(\.0*|(?<=(\..*))0*)$/, '');
		document.getElementById( "frequencyChangeSliderLeft" ).value = f;
	}
}


function initPlots()
{
	// Get scoep elements.
	analogScope = document.getElementById( "analogScope" );
	digitalScope = document.getElementById( "digitalScope" );


	// Create colors for the traces.
	let colors = 
		[ 
			"#445C56",	// Feldgrau
			"#C1E364",	// June Bud
			"#866BD1",	// Medium Purple
			"#B03C57",	// Amaranth Purple
			"#5C6B31",	// Dark Olive Green
			"#93B8B0",	// Opal
			"#AD5E6F",	// Rose Dust
			"#AE97E6",	// Maximum Blue Purple
			"#4813CF",	// Medium Blue
			"#A84C60",	// China Rose
			"#3ABA85",	// Ocean Green
			"#383275",	// St Patricks Blue
			"#FAB1D0",	// Nadeshiko Pink
			"#94345C",	// Quinacridone Magenta
			"#2E1EE3",	// Blue
			"#7FABAD",	// Cadet Blue
		];


	// Create the labels for the traces (digital pins 2-13 and analog A2-A5).
	let tickTexts = 
		[
			"2",
			"3",
			"4",
			"5",
			"6",
			"7",
			"8",
			"9",
			"10",
			"11",
			"12",
			"13",
			"A2",
			"A3",
			"A4",
			"A5",
		];


	// Create foreground and background colors. Make sure these match the page CSS styles!
	let bgColor = "#232323";
	let fgColor = "#e6e6e6";


	// Initialize an x and y array for each analog channel trace and add the names as A0-A{numAnalogChannels}.
	for( let idx = 0; idx < numAnalogChannels; idx++ )
		analogData.push( { y: [ 0 ], x: [ undefined ], name: "A" + idx } );


	// Initialize an x and y array for each digital channel.
	// Since each channel is a separate subplot with a separate y-axis,
	// we need to set the attributes here for each y-axis.
	digitalData.push( { y: [ 0 ], x: [ undefined ], type: "scatter", fill: "tozeroy", marker: { color: colors[ 0 ] }, name: tickTexts[ numDigitalChannels - 1 ] } );
	for( let idx = 1; idx < numDigitalChannels; idx++ )
		digitalData.push( { 
			y: [ 0 ], 
			x: [ undefined ], 
			yaxis: ( "y" + ( idx + 1 ) ), 						// Set the y-axis to use for this data.
			type: "scatter", 									// Scatter trace.
			fill: "tozeroy",									// Fill from zero to the y value.
			marker: {											
				color: colors[ idx ]							// Set the trace color.
			},
			name: tickTexts[ numDigitalChannels - idx - 1 ],	// Set the name of the trace.
		} );


	// Create the layout for the analog plot.
	let analogLayout = {
		'margin': { 				// Set margin in pixels from the...
			t: 20,					// Top
			b: 20,					// Bottom
			l: 20					// Left
		},
		xaxis: {
			color: fgColor,			// Set the color for line, font, tick, and grid to the foreground color.
			showgrid: true,			// Turn on the grid.
			range: xrange,			// Set the range.
			tickmode: "auto",		// Set to 'auto' to force set the number of ticks via nticks.
			nticks: 21,				// Set to 21 ticks. +1 to make 20 boxes. Double nticks for y-axis since the plot is twice as wide as it is tall.
		},
		yaxis: {
			// title: "Value",
			color: fgColor,			// Set the color for line, font, tick, and grid to the foreground color.
			showgrid: true,			// Turn on the gride.
			range: yrange,			// Set the range.
			tickmode: "auto",		// Set to 'auto' to force set the number of ticks via nticks.
			nticks: 11,				// Set to 11 ticks. +1 to make 10 boxes. Half of nticks for x-axis since the plot is half as tall as it is wide.
		},
		legend: {
			font: {
				color: fgColor		// Set the color of the text in the legend.
			}
		},


		"paper_bgcolor": bgColor,	// Set the color of the area outside of the plot.
		"plot_bgcolor": bgColor		// Set the color of teh interior of the plot.
	};


	let digitalLayout = { 
		'margin': { 				// Set margin in pixels from the...
			t: 5,					// Top
			b: 20,					// Bottom
			l: 40,					// Left
			r: 20					// Right
		},
		
		'showlegend': false,		// Turn off the legend. We're putting this information on the ticks.
		
		xaxis: { 					
			showgrid: true,			// Turn on the gride.
			color: fgColor,			// Set the color for line, font, tick, and grid to the foreground color.
			range: xrange 			// Set the range.
		},

		// Not putting the y-axis here
		// because we have to do that
		// for each individual 
		// channel/subplot.

		"paper_bgcolor": bgColor,	// Set the color of the area outside of the plot.
		"plot_bgcolor": bgColor,	// Set the color of the interior of the plot.
	};


	// Iterate through each channel and format the y-axis.
	for( let idx = 0; idx < numDigitalChannels; idx++ )
	{
		// Y-axis naming format is 'yaxis', 'yaxis2', 'yaxis3', ...
		digitalLayout[ 'yaxis' + ( idx == 0 ? '' : ( idx + 1 ) ) ] = 
		{
			range: [ 0, 1.5 ],	// Set the y-axis range. Add a little extra (over 1) on top for spacing between channels.

			// The domain is over [0, 1] and covers the entire plot.
			// Need to divide this into chunks of (1/numDigitalChannels)
			// and evenly distribute for each subplot.
			domain: [ ( ( idx ) * ( 1 / numDigitalChannels ) ), ( ( idx + 1 ) * ( 1 / numDigitalChannels ) ) ],

			autorange: false,
			showgrid: true,

			color: fgColor,

			tickmode: "array",
			tickvals: [ 0 ],
			// ticktext: [ "Trace " + idx ],
			ticktext: [ tickTexts[ numDigitalChannels - idx - 1 ] + "  " ],
			tickfont: {
				color: fgColor
			},
			ticklen: 30,
			tickcolor: colors[ idx ],
			ticklabelposition: "outside top",


			// Set the y-axis to be visible so that the zero line
			// shows up. Then we can set the color of it to match
			// the color of the channel. This way, when the channel
			// is high, it has a matching border on top and bottom.
			visible: true,		
			zeroline: true,
			zerolinecolor: colors[ idx ],
		}
	}


	// 
	let analogConfig = {
		staticPlot: true,	// Remove hover icons.
		responsive: true
	};

	let digitalConfig = {
		// staticPlot: true,
		responsive: true
	};


	Plotly.newPlot( analogScope, analogData, analogLayout, analogConfig );
	Plotly.newPlot( digitalScope, digitalData, digitalLayout, digitalConfig );
}

async function connect()
{
	try
	{
		port = await cereal.requestPort();			// Open serial port selection dialog.
		await port.open( { baudRate: 2000000 } );	// Open the selected port.
	}
	catch ( err )
	{
		console.log( "Error: ", err );
		return;
	}

	connectBtn.onclick = disconnect;
	connectBtn.value = "Disconnect";

	console.log( "Port Selected: ", port );

	let decoder = new TextDecoderStream( "utf-8" );
	inputDone = port.readable.pipeTo( decoder.writable );
	inputStream = decoder.readable;

	reader = inputStream.getReader();

	// startTime = performance.now();
	numDataPointsCollected = 0;
	collectionCount = 0;
	
	readLoop();

	frozenAnalog = false;
	frozenDigital = false;
	
	document.getElementById( "freezeAnalogBtn" ).value = "Freeze";
	document.getElementById( "freezeDigitalBtn" ).value = "Freeze";

	intervalID = setInterval( () => { if( !frozenAnalog ) plotAnalogPoints(); }, interval );
	intervalIDDigital = setInterval( () => { if( !frozenDigital ) plotDigitalPoints(); }, intervalDigital );
	intervalIDChannelData = setInterval( updateChannelData, intervalChannelData );
}

async function disconnect()
{
	await reader.cancel();
	await inputDone.catch( () => { console.log( "Port Closed." ); } );
	reader = undefined;
	inputDone = undefined;

	await port.close();
	port = undefined;

	channelDataArea.value += "\n\nPort Closed.";

	connectBtn.onclick = connect;
	connectBtn.value = "Connect";

	clearInterval( intervalID );
	clearInterval( intervalIDDigital );
	clearInterval( updateChannelData );
}


async function readLoop()
{
	let values = [], i;
	let buffer = "";

	while( true )
	{
		try
		{
			const{ value, done } = await reader.read();

			if( value )
			{
				buffer += value;

				// bufferDataArea.value = "Samples Ready: " + ( buffer.split( "\n" ).length ) + "\n";
				// bufferDataArea.value += buffer;

				if( buffer.includes( "\n" ) )
				{
					let bufferLines = buffer.split( "\n" );
					// plotDataArea.value = "";
					for( i = 0, max = bufferLines.length - 1; i < max; i++ )
					{
						if( bufferLines[ i ].length !== 8 )
						{
							// console.log( bufferLines[ i ] );
							continue;
						}

						for( j = 0; j < numAnalogChannels; j++ )
							values[ j ] = 5 * parseInt( bufferLines[ i ].substring( 2 * j, 2 * ( j + 1 ) ), 16 ) / 255;

						if( isNaN( values[ 0 ] ) || isNaN( values[ 1 ] ) )
							continue;


						let digitalVals = parseInt( bufferLines[ i ].substring( 4, 8 ), 16 );
						for( j = 0; j < numDigitalChannels; j++ )
							values[ numAnalogChannels + j ] = ( digitalVals & ( 0x8000 >> j ) ) ? 1 : 0; 


						if( collectionCount > collectionCountBuffer )
						{
							numDataPointsCollected += 2;
							elapsedTime = performance.now() - startTime;
						}
						else if( collectionCount == collectionCountBuffer )
						{
							startTime = performance.now();
							collectionCount++;
						}
						else
						{
							collectionCount++;
						}


						for( j = 0; j < numAnalogChannels; j++ )
						{
							analogData[ j ][ 'y' ][ index ] = values[ j ];
							analogData[ j ][ 'x' ][ index ] = index;
						}

						for( j = 0; j < numDigitalChannels; j++ )
						{
							digitalData[ j ][ 'y' ][ indexDigital ] = values[ 2 + j ];
							digitalData[ j ][ 'x' ][ indexDigital ] = indexDigital;
						}

						index = ( index + 1 ) % maxVals;
						indexDigital = ( indexDigital + 1 ) % maxValsDigital;
					}

					buffer = bufferLines[ bufferLines.length - 1 ];
				}
			}

			if( done )
			{
				console.log( "[readLoop] DONE", done );
				reader.releaseLock();
				break;
			}
		}
		catch( err )
		{
			disconnect();
			bufferDataArea.value = err;
			reader.releaseLock();
			break;
		}
	}
}


function updatePlotLayout()
{
	Plotly.relayout(
		analogScope,
		{
			'xaxis.range': [ xLow, xHigh ],
			// 'yaxis.range': [ yLow, yHigh ]	// Comment this out until we implement it to save some time redrawing.
		}
	);

	Plotly.relayout( digitalScope, { 'xaxis.range': [ xLowDigital, xHighDigital ] } );
}


function updateChannelData()
{
	channelDataArea.value =   "Channels:              " + numAnalogChannels + " analog, " + numDigitalChannels + " digital" + 
							"\nElapsed Time:          " + ( elapsedTime / 1000 ).toLocaleString( undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 } ) + " seconds" + 
							"\nData Points Collected: " + numDataPointsCollected.toLocaleString( undefined, { maximumFractionDigits: 0 } ) + 
							"\nDPS:                   " + ( numDataPointsCollected / ( elapsedTime / 1000 ) ).toLocaleString( undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 } ) + " Sps";
}


function plotAnalogPoints()
{
	let i, j, numClear;
	let percentClear = 0.02;

	numClear = ( maxVals * percentClear ) < 1 ? 1 : ( maxVals * percentClear );
	for( i = 0; i < numAnalogChannels; i++ )
		for( j = 1; j <= numClear; j++  )
			analogData[ i ][ 'x' ][ ( index + j ) % maxVals ] = undefined;

	Plotly.animate( analogScope,
		{
			data: analogData
		},
		{
			transition: {
				duration: 0,
				easing: 'cubic-in-out'
			},
			frame: {
				duration: 0
			}
		}
	);

	/* 	
		Restyle is slower than animate for some reason.
		Leaving this here as a reminder.
	*/
	// for( i = 0; i < numAnalogChannels; i++ )
	// {
	// 	Plotly.restyle( analogScope, { y: [ analogData[ i ][ 'y' ] ] }, i );
	// 	Plotly.restyle( analogScope, { x: [ analogData[ i ][ 'x' ] ] }, i );
	// }

	if( updateLayoutFlag )
	{
		updateLayoutFlag = false;
		updatePlotLayout();
	}
}


function plotDigitalPoints()
{
	let i, j, numClear;
	let percentClear = 0.02;

	numClear = ( maxValsDigital * percentClear ) < 1 ? 1 : ( maxValsDigital * percentClear );
	for( i = 0; i < numDigitalChannels; i++ )
		for( j = 1; j <= numClear; j++ )
			digitalData[ i ][ 'x' ][ ( indexDigital + j ) % maxValsDigital ] = undefined;

	Plotly.animate( digitalScope,
		{
			data: digitalData
		},
		{
			transition: {
				duration: 0,
				easing: 'cubic-in-out'
			},
			frame: {
				duration: 0
			}
		} 
	);

	if( updateLayoutFlag )
	{
		updateLayoutFlag = false;
		updatePlotLayout();
	}
}

})(window);