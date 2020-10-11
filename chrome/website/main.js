const cereal = navigator.serial;

var connected = false;
var port = null;
var decoder = new TextDecoderStream();
var inputDone = null, inputStream = null, reader = null;
var contentArea = null;

var connectBtn = document.getElementById( "deviceConnect" );
connectBtn.onclick = connect;


window.addEventListener( "load", async ( event ) => {
	contentArea = document.getElementById( "content" );
} );

async function connect()
{
	try
	{
		port = await cereal.requestPort();			// Open serial port selection dialog.
		await port.open( { baudrate: 250000 } );	// Open the selected port.
	}
	catch ( err )
	{
		console.log( "Error: ", err );
		return;
	}

	connectBtn.onclick = disconnect;
	connectBtn.value = "Disconnect";

	console.log( "Port Selected: ", port );


	inputDone = port.readable.pipeTo( decoder.writable );
	inputStream = decoder.readable;

	reader = inputStream.getReader();
	
	readLoop();
}

async function disconnect()
{
	await reader.cancel();
	await inputDone.catch( () => { console.log( "Port Closed." ); } );
	reader = null;
	inputDone = null;

	await port.close();

	contentArea.value = "";

	connectBtn.onclick = connect;
	connectBtn.value = "Connect";
}


async function readLoop()
{
	let values = [], i;
	let buffer = "";

	while( true )
	{
		const{ value, done } = await reader.read();
		if( value )
		{
			buffer += value;

			if( buffer.includes( "\n" ) )
			{
				let idx = buffer.indexOf( "\n" );
				values = buffer.substr( 0, idx ).split( " " );
				buffer = buffer.substr( idx + 1 );

				contentArea.value = value + "\n";
				for( i = 0; i < values.length; i++ )
				{
					values[ i ] = parseFloat( values[ i ] );
					contentArea.value += values[ i ] + " ";
				}
				contentArea.value += "\nChannels: " + values.length;

				if( values.length !== numChannels )
				{
					console.log( values.length + " !== " + numChannels, "'" + value + "'" );
				}

				plotPoints( values );
			}
		}

		if( done )
		{
			console.log( "[readLoop] DONE", done );
			reader.releaseLock();
			break;
		}
	}
}


function plotPoints( values )
{
	let i, j;
	for( i = 0; i < numChannels; i++ )
	{
		if( values.length === numChannels )
		{
			data[ i ][ 'y' ][ index ] = values[ i ] === undefined ? 0 : values[ i ];
			data[ i ][ 'x' ][ index ] = index;
		}
		else
		{
			data[ i ][ 'y' ][ index ] = undefined;
			data[ i ][ 'x' ][ index ] = undefined;
		}
	}

	let numClear = ( maxVals * 0.02 ) < 1 ? 1 : ( maxVals * 0.02 );
	for( i = 0; i < numChannels; i++ )
		for( j = 1; j <= numClear; j++  )
			data[ i ][ 'x' ][ ( index + j ) % maxVals ] = undefined;

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
var maxVals = 11;

var xHigh = maxVals - 1, xLow = 0;
var yHigh = 5, yLow = 0;
let xrange = [ xLow, xHigh ];
let yrange = [ yLow, yHigh ];


let index = 0;
let numChannels = 2;
let data = [];
for( let idx = 0; idx < numChannels; idx++ )
{
	data.push( { y: [], x: [] } );
}
console.log( data );
// let data = [ { y: [], x: [] } ];
// let i;
// for( i = 0; i < maxVals; i++ )
// {
// 	data[ 0 ][ 'x' ][ i ] = i;
// 	data[ 0 ][ 'y' ][ i ] = undefined;
// }

let layout = {
	'margin': { t: 0 },
	xaxis: {
		title: "Sample",
		showgrid: true,
		range: xrange
	},
	yaxis: {
		title: "Value",
		showgrid: true,
		range: yrange
	}
}

TESTER = document.getElementById('tester');
Plotly.newPlot( TESTER, data, layout );

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

