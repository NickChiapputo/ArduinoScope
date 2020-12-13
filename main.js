const cereal = navigator.serial;

var connected = false;
var port = undefined;
var inputDone = undefined, inputStream = undefined, reader = undefined;
var bufferDataArea = undefined, plotDataArea = undefined, channelDataArea = undefined;

var connectBtn = document.getElementById( "deviceConnect" );
connectBtn.onclick = connect;

var startTime, elapsedTime;
var numDataPointsCollected;
var collectionCount, collectionCountBuffer = 5;	// Ignore the first 5 data point collections when testing the start time.

let intervalID = undefined;

window.addEventListener( "load", async ( event ) => {
	bufferDataArea = document.getElementById( "bufferDataArea" );
	plotDataArea = document.getElementById( "plotDataArea" );
	channelDataArea = document.getElementById( "channelDataArea" );


	if( "serial" in navigator )
	{
		bufferDataArea.value = "Serial API found!";
	}
	else
	{
		channelDataArea.value = "Serial API not found!";
		connectBtn.onclick = () => { channelDataArea.value = "Can't connect to serial ports. Serial API not found."; };
	}
} );

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
	intervalID = setInterval( plotPoints, 250 );
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
			console.log( typeof value, typeof done );

			if( value )
			{
				buffer += value;

				bufferDataArea.value = "Samples Ready: " + ( buffer.split( "\n" ).length ) + "\n";
				bufferDataArea.value += buffer;

				if( buffer.includes( "\n" ) )
				{
					/*
					let idx = buffer.indexOf( "\n" );
					values = buffer.substring( 0, idx ).split( " " );
					buffer = buffer.substring( idx + 1 );

					plotDataArea.value = "";
					for( i = 0; i < values.length; i++ )
					{
						values[ i ] = 5 * parseFloat( values[ i ] ) / 1023;
						plotDataArea.value += values[ i ] + " ";
					}
					channelDataArea.value = "Channels: " + values.length;

					if( values.length !== numChannels )
					{
						console.log( values.length + " !== " + numChannels, "'" + value + "'" );
					}

					plotPoints( values );
					*/

					let bufferLines = buffer.split( "\n" );
					let currLine, idx;
					plotDataArea.value = "";
					for( i = 0, max = ( bufferLines.length - 1 ) < 1000 ? ( bufferLines.length - 1 ) : 100; i < max; i++ )
					{
						currLine = bufferLines[ i ];

						// We can remove this ONLY if we know the exact format of the data.
						// If we change to an exact compression (e.g., one char per data point),
						// then we can change this function call to a static value or replace it
						// in the substring call with a static value.
						idx = currLine.indexOf( "\n" );	

						/*
						values = currLine.split( " " );

						let temp;
						for( j = 0, numVals = values.length; j < numVals; j++ )
						{
							// for( let idx = 0; idx < values[ j ].length; idx++ )
							// 	plotDataArea.value += "( " + values[ j ][ idx ] + ", " + values[ j ].charCodeAt( idx ) + " ) ";
							// temp = parseFloat( values[ j ] );
							// temp = values[ j ].charCodeAt( 0 );
							temp = parseInt( values[ j ], 16 )
							if( isNaN( temp ) )
								continue;

							if( conversionFlag )
								values[ j ] = 5 * temp / 255;
							else
								values[ j ] = temp;

							
						}
						*/
						// input = parseInt( currLine.substring( 0, 8 ), 16 );

						values[ 0  ] = 5 * parseInt( currLine.substring( 0, 2 ), 16 ) / 255;
						values[ 1  ] = 5 * parseInt( currLine.substring( 2, 4 ), 16 ) / 255;
						// values[ 0 ] = 5 * ( ( input >> 6 ) & 0xff ) / 255;
						// values[ 1 ] = 5 * ( ( input >> 4 ) & 0xff ) / 255;

						// digitalVals = parseInt( currLine.substring( 4, 8 ), 16 );

						for( j = 0; j < ( numChannels - 2 ); j++ )
						{
							// values[ 2 + j ] = ( digitalVals & ( 0x800 >> j ) ) ? 5 : 0; 
							values[ 2 + j ] = 0;
						}
						// values[ 2  ] = ( digitalVals & 0x8000 ) ? 5 : 0;
						// values[ 3  ] = ( digitalVals & 0x4000 ) ? 5 : 0;
						// values[ 4  ] = ( digitalVals & 0x2000 ) ? 5 : 0;
						// values[ 5  ] = ( digitalVals & 0x1000 ) ? 5 : 0;
						// values[ 6  ] = ( digitalVals & 0x0800 ) ? 5 : 0;
						// values[ 7  ] = ( digitalVals & 0x0400 ) ? 5 : 0;
						// values[ 8  ] = ( digitalVals & 0x0200 ) ? 5 : 0;
						// values[ 9  ] = ( digitalVals & 0x0100 ) ? 5 : 0;
						// values[ 10 ] = ( digitalVals & 0x0080 ) ? 5 : 0;
						// values[ 11 ] = ( digitalVals & 0x0040 ) ? 5 : 0;
						// values[ 12 ] = ( digitalVals & 0x0020 ) ? 5 : 0;
						// values[ 13 ] = ( digitalVals & 0x0010 ) ? 5 : 0;
						// values[ 14 ] = ( digitalVals & 0x0008 ) ? 5 : 0;
						// values[ 15 ] = ( digitalVals & 0x0004 ) ? 5 : 0;
						// values[ 16 ] = ( digitalVals & 0x0002 ) ? 5 : 0;
						// values[ 17 ] = ( digitalVals & 0x0001 ) ? 5 : 0;
						plotDataArea.value += values[ 0 ] + " " + values[ 1 ] + "\n";

						if( collectionCount > collectionCountBuffer )
						{
							// numDataPointsCollected += values.length;
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

						channelDataArea.value =   "Channels:              " + values.length + 
												"\nElapsed Time:          " + ( elapsedTime / 1000 ).toFixed( 2 ) + " seconds" + 
												"\nData Points Collected: " + numDataPointsCollected + 
												"\nDPS:                   " + ( numDataPointsCollected / ( elapsedTime / 1000 ) ).toFixed( 2 ) + " Sps";

						if( values.length !== numChannels )
						{
							// console.log( values.length + " !== " + numChannels, "'" + values + "'" );
						}

						for( j = 0; j < numChannels; j++ )
						{
							if( values.length === numChannels )
							{
								data[ j ][ 'y' ][ index ] = values[ j ] === undefined || isNaN( values[ j ] ) ? 0 : values[ j ];
								data[ j ][ 'x' ][ index ] = index;
							}
							else
							{
								data[ j ][ 'y' ][ index ] = undefined;
								data[ j ][ 'x' ][ index ] = undefined;
							}
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
	for( i = 0; i < numChannels; i++ )
		for( j = 1; j <= numClear; j++  )
			data[ i ][ 'x' ][ ( index + j ) % maxVals ] = undefined;



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
			TESTER,
			{
				'xaxis.range': [ xLow, xHigh ],
				'yaxis.range': [ yLow, yHigh ]
			}
		);
	}
}


var interval = 125;
var numVals = 0;
var maxVals = 10000 + 1;

var xHigh = maxVals - 1, xLow = 0;
var yHigh = 5, yLow = 0;
let xrange = [ xLow, xHigh ];
let yrange = [ yLow, yHigh ];
let y_tickvals = [ 0, 1, 2, 3, 4, 5 ]

// Define whether input needs to be converted
let conversionFlag = true;

let index = 0;
let numChannels = 10;
let data = [];
for( let idx = 0; idx < numChannels; idx++ )
{
	data.push( { y: [], x: [] } );
}

let layout = {
	'margin': { t: 0 },
	xaxis: {
		title: "Sample",
		showgrid: true,
		range: xrange,
		automargin: true
	},
	yaxis: {
		title: "Value",
		showgrid: true,
		range: yrange,
		tickvals: y_tickvals,
		automargin: true		// Required to fit the top tick mark on the plot if it's equal to the maximum y-axis value.
	}
};

let config = {
	staticPlot: true,	// Remove hover icons.
	responsive: true
};

TESTER = document.getElementById('tester');
Plotly.newPlot( TESTER, data, layout, config );

var updateLayoutFlag = true;


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


// setInterval( randomizerCircular, interval );


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

