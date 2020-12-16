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
var intervalID 			= undefined,
	interval 			= 40,
	intervalCnt			= 0,
	digitalUpdateFreq	= 25,
	numVals 			= 0,
	maxVals 			= 10000 + 1,
	xHigh 				= maxVals - 1,
	xLow 				= 0,
	yHigh 				= 5,
	yLow 				= 0,
	xrange 				= [ xLow, xHigh ],
	yrange 				= [ yLow, yHigh ],
	y_tickvals 			= [ 0, 1, 2, 3, 4, 5 ];


// Data Recording
var	conversionFlag 		= true,
	index 				= 0,
	numAnalogChannels 	= 2,
	numDigitalChannels	= 16,
	analogData 			= [],
	digitalData			= [];


var lowInput = document.getElementById( "low" );
lowInput.value = xLow;
lowInput.addEventListener( "change", () => 
	{
		xLow = parseInt( lowInput.value );
		maxVals = xHigh - xLow + 1;
		updateLayoutFlag = true;

		console.log( "High: ", xHigh, ", Low: ", xLow )
	} 
);

var highInput = document.getElementById( "high" );
highInput.value = xHigh;
highInput.addEventListener( "change", () => 
	{
		xHigh = parseInt( highInput.value );
		maxVals = xHigh - xLow + 1;
		updateLayoutFlag = true;

		console.log( "High: ", xHigh, ", Low: ", xLow );
	}
);


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
let bgColor = "#232323";
let fgColor = "#e6e6e6";


for( let idx = 0; idx < numAnalogChannels; idx++ )
	analogData.push( { y: [ 0 ], x: [ undefined ] } );

digitalData.push( { y: [ 0 ], x: [ undefined ], type: "scatter", fill: "tozeroy" } );
for( let idx = 1; idx < numDigitalChannels; idx++ )
	digitalData.push( { 
		y: [ 0 ], 
		x: [ undefined ], 
		yaxis: ( "y" + ( idx + 1 ) ), 
		type: "scatter", 
		fill: "tozeroy",
		marker: {
			color: colors[ idx ]
		}
	} );

var analogLayout = {
	'margin': { 
		t: 20,
		b: 20,
		l: 20
	},
	xaxis: {
		// title: "Sample",
		showgrid: true,
		range: xrange,
		automargin: true
	},
	yaxis: {
		// title: "Value",
		showgrid: true,
		range: yrange,
		autorange: false,
		tickvals: y_tickvals,
		automargin: true		// Required to fit the top tick mark on the plot if it's equal to the maximum y-axis value.
	},
	legend: {
		traceorder: 'reversed',
		font: {
			color: fgColor
		}
	},

	"paper_bgcolor": "#232323",
	"plot_bgcolor": "#232323"
};


var digitalLayout = { 
	'margin': { 
		t: 5,
		b: 20,
		l: 40
	},
	// annotations: digitalAnnotations,
	legend: {
		// traceorder: 'reversed',
		font: {
			color: fgColor
		}
	},
	xaxis: { 
		range: [0, maxVals] 
	},

	"paper_bgcolor": bgColor,
	"plot_bgcolor": bgColor,
};


for( let idx = 0; idx < numDigitalChannels; idx++ )
{
	digitalLayout[ 'yaxis' + ( idx == 0 ? '' : ( idx + 1 ) ) ] = 
	{
		range: [ 0, 1.2 ],
		domain: [ 1 - ( ( idx + 1 ) * ( 1 / numDigitalChannels ) ), 1 - ( ( idx ) * ( 1 / numDigitalChannels ) ) ],
		visible: true,
		autorange: false,

		tickmode: "array",
		tickvals: [ 0 ],
		// ticktext: [ "Trace " + idx ],
		ticktext: [ tickTexts[ numDigitalChannels - idx - 1 ] ],
		tickfont: {
			color: fgColor
		},
		ticklen: 15,
		tickcolor: colors[ idx ],

		zeroline: false,
	}
}
console.log( digitalLayout );
console.log( digitalData );

var analogConfig = {
	staticPlot: true,	// Remove hover icons.
	responsive: true
};

var digitalConfig = {
	// staticPlot: true,
	responsive: true
};

var analogScope, digitalScope;

var updateLayoutFlag = true;


// Sound Output
var audioCtx = undefined, 
	oscillator = undefined,
	soundPlaying = false;


window.addEventListener( "load", async ( event ) => {
	bufferDataArea = document.getElementById( "bufferDataArea" );
	plotDataArea = document.getElementById( "plotDataArea" );
	channelDataArea = document.getElementById( "channelDataArea" );


	// Create sound output options.
	let startSoundBtn = document.getElementById( "startSound" );
	let stopSoundBtn = document.getElementById( "stopSound" );
	let frequencyChange = document.getElementById( "frequencyChange" );

	startSoundBtn.addEventListener( "click", playSound );
	stopSoundBtn.addEventListener( "click", stopSound );
	frequencyChange.addEventListener( "change", () => { changeFrequency( frequencyChange.value ); } );


	if( "serial" in navigator )
	{
		bufferDataArea.value = "Serial API found!";
		initPlots();
	}
	else
	{
		channelDataArea.value = "Serial API not found!";
		connectBtn.onclick = () => { channelDataArea.value = "Can't connect to serial ports. Serial API not found."; };
	}
} );


function playSound()
{
	if( soundPlaying )
		oscillator.stop();
	soundPlaying = true;

	// create web audio api context
	audioCtx = new (window.AudioContext || window.webkitAudioContext)();

	// create Oscillator node
	oscillator = audioCtx.createOscillator();

	oscillator.type = 'square';
	oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // value in hertz
	oscillator.connect(audioCtx.destination);
	oscillator.start();
}


function changeFrequency( f )
{
	oscillator.frequency.setValueAtTime( f, audioCtx.currentTime );
}


function stopSound()
{
	oscillator.stop();
	soundPlaying = false;
}


function initPlots()
{
	connectBtn = document.getElementById( "deviceConnect" );
	connectBtn.onclick = connect;


	analogScope = document.getElementById( "analogScope" );
	digitalScope = document.getElementById( "digitalScope" );


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
	intervalID = setInterval( plotPoints, interval );
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

				bufferDataArea.value = "Samples Ready: " + ( buffer.split( "\n" ).length ) + "\n";
				bufferDataArea.value += buffer;

				if( buffer.includes( "\n" ) )
				{
					let bufferLines = buffer.split( "\n" );
					plotDataArea.value = "";
					for( i = 0, max = bufferLines.length - 1; i < max; i++ )
					{
						if( bufferLines[ i ].length !== 8 )
						{
							// console.log( bufferLines[ i ] );
							continue;
						}

						values[ 0 ] = 5 * parseInt( bufferLines[ i ].substring( 0, 2 ), 16 ) / 255;
						values[ 1 ] = 5 * parseInt( bufferLines[ i ].substring( 2, 4 ), 16 ) / 255;

						if( isNaN( values[ 0 ] ) || isNaN( values[ 1 ] ) )
							continue;

						plotDataArea.value += values[ 0 ] + " " + values[ 1 ].toFixed( 2 ) + " ";

						let digitalVals = parseInt( bufferLines[ i ].substring( 4, 8 ), 16 );

						plotDataArea.value += "- " + digitalVals + " - ";

						for( j = 0; j < numDigitalChannels; j++ )
						{
							// let digitalVal = parseInt( bufferLines[ i ].substring( 4 + j, 4 + j + 1 ), 16 );
							// values[ 2 + j ] = 
							values[ 2 + j ] = ( digitalVals & ( 0x8000 >> j ) ) ? 1 : 0; 
							plotDataArea.value += values[ 2 + j ] + " ";
							// values[ 2 + j ] = 0;
						}
						plotDataArea.value += "\n";

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

						// if( elapsedTime > 5000 )
						// {
						// 	startTime = performance.now();
						// 	elapsedTime = 0;
						// 	numDataPointsCollected = 0;
						// }

						// channelDataArea.value =   "Channels:              " + values.length + 
						// 						"\nElapsed Time:          " + ( elapsedTime / 1000 ).toFixed( 2 ) + " seconds" + 
						// 						"\nData Points Collected: " + numDataPointsCollected + 
						// 						"\nDPS:                   " + ( numDataPointsCollected / ( elapsedTime / 1000 ) ).toFixed( 2 ) + " Sps";

						if( values.length !== numAnalogChannels )
						{
							// console.log( values.length + " !== " + numChannels, "'" + values + "'" );
						}

						for( j = 0; j < numAnalogChannels; j++ )
						{
							analogData[ j ][ 'y' ][ index ] = values[ j ] === undefined || isNaN( values[ j ] ) ? undefined : values[ j ];
							analogData[ j ][ 'x' ][ index ] = index;
						}

						for( j = 0; j < numDigitalChannels; j++ )
						{
							digitalData[ j ][ 'y' ][ index ] = values[ 2 + j ];
							digitalData[ j ][ 'x' ][ index ] = index;
						}

						index = ( index + 1 ) % maxVals;
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


function plotPoints()
{
	let i, j;

	let numClear = ( maxVals * 0.02 ) < 1 ? 1 : ( maxVals * 0.02 );
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

	if( intervalCnt >= digitalUpdateFreq )
	{
		for( i = 0; i < numDigitalChannels; i++ )
			for( j = 1; j <= numClear; j++ )
				digitalData[ i ][ 'x' ][ ( index + j ) % maxVals ] = undefined;

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

		intervalCnt = 0;
	}

	intervalCnt++;


	channelDataArea.value =   "Channels:              " + numAnalogChannels + " analog, " + numDigitalChannels + " digital" + 
							"\nElapsed Time:          " + ( elapsedTime / 1000 ).toFixed( 2 ) + " seconds" + 
							"\nData Points Collected: " + numDataPointsCollected + 
							"\nDPS:                   " + ( numDataPointsCollected / ( elapsedTime / 1000 ) ).toFixed( 2 ) + " Sps";

	// let data_update = { data: data };
	// let layout_update = { 
	// 	'xaxis.range': [ xLow, xHigh ],
	// 	'yaxis.range': [ yLow, yHigh ]
	// };
	// Plotly.update( TESTER, data_update, layout_update );


	if( updateLayoutFlag )
	{
		updateLayoutFlag = false;

		Plotly.relayout(
			analogScope,
			{
				'xaxis.range': [ xLow, xHigh ],
				'yaxis.range': [ yLow, yHigh ]
			}
		);
	}
}






function randomizerCircular()
{
	data[ 0 ][ 'y' ][ index ] = Math.random();
	data[ 0 ][ 'x' ][ index ] = index;

	let i;
	let numClear = ( maxVals * 0.02 ) < 1 ? 1 : ( maxVals * 0.02 );
	for( i = 1; i <= numClear; i++  )
		data[ 0 ][ 'x' ][ ( index + i ) % maxVals ] = undefined;
	index = ( index + 1 ) % maxVals;


	Plotly.animate( TESTER,
		{
			data: data
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

		console.log( "Update Layout" );

		Plotly.relayout(
			TESTER,
			{
				'xaxis.range': [ xLow, xHigh ],
				'yaxis.range': [ yLow, yHigh ]
			}
		);
	}
}


function randomizerFull()
{
	let x = [], y = [];
	let i;


	elapsed = performance.now() - last;
	last += elapsed;
	console.log( elapsed );


	// let xStr = "", yStr = "";
	for( i = low; i <= high; i++ )
	{
		x.push( i );

		let newVal = Math.random();

		y.push( newVal );

		// xStr += i.toFixed( 2 ) + " ";
		// yStr += newVal.toFixed( 2 ) + " ";
	}

	// document.getElementById( "content" ).value = xStr + "\n" + yStr;


	data[ 0 ][ 'y' ] = y;
	data[ 0 ][ 'x' ] = x;

	Plotly.animate(TESTER, 
		{
			data: data,
			traces: [0]
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

		Plotly.relayout(
			TESTER,
			{
				'xaxis.range': [ low, high ],
				'yaxis.range': [ 0, 1 ]
			}
		);
	}
}


function scrollingExample()
{
	let x = [], y = [];
	let curr_low = parseInt( lowInput.value );
	let curr_high = parseInt( highInput.value );
	let i;

	elapsed = performance.now() - last;
	last += elapsed;
	console.log( elapsed );


	data[ 0 ][ 'x' ].push( numVals );
	data[ 0 ][ 'y' ].push( Math.random() );

	if( numVals <= maxVals )
	{
		
	}
	else
	{
		xrange = [ numVals - maxVals, numVals ];
	}

	numVals++;

	Plotly.relayout(
		TESTER,
		{
			'xaxis.range': xrange
		}
	);

	Plotly.extendTraces( TESTER, 
		{
			y: [[ Math.random() ]]
		},
		[ 0 ]
	);
}

