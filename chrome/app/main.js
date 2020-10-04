// Redefine the chrome.serial API to make it shorter.
const serial = chrome.serial;

// Create global references to the parameter fields.
// Set them undefined until they are initialized on window load.
var connectBtn = undefined;
var portSelect = undefined;
var bitRateSelect = undefined;


// Global reference to the connection ID set when the device is connected.
var connectionID = undefined;


// Create global references to the connection parameters.
// Data, parity, and stop bits can be changed on Arduino,
// so we might as well make the customizable here too for now.
// Arduino default is 8N1.
var port = undefined;		// System path of the serial port.
var connectionOptions = {
	"bitrate"	: undefined,	// integer value. Common values: 110, 300, 1200, 2400, 4800, 9600, 14400, 19200, 38400, 57600, 115200
	"dataBits"	: "eight",		// "seven", "eight"
	"parityBit"	: "no",			// "no", "odd", "even"
	"stopBits"	: "one",		// "one", "two"
}


// After window load (DOM load + content).
// Initialize the parameter fields.
window.addEventListener( "load", function( e )
{
	// Initialize the parameter field objects.
	// Get the DOM elements.
	initParameterFields();


	// Get a list of the available ports.
	// Callback function will populate the port
	// select field.
	serial.getDevices( onGetDevices );


	// Add event listeners for Serial API and input elements.
	addEventListeners();
} );


/****
	*	Initialize the global parameter field objects.
	*	Get the DOM elements on the page.
	*
	*	@param None
	*
	*	@return None
****/
function initParameterFields()
{
	// Get the DOM elements for the parameter fields.
	connectBtn = document.getElementById( "connectBtn" );
	portSelect = document.getElementById( "portSelect" );
	bitRateInput = document.getElementById( "bitrate" );


	// Verify that all of the fields were found correctly.
	if( connectBtn === undefined || portSelect === undefined || bitRateInput === undefined )
	{
		console.log( "Unable to get input fields\n", connectBtn, "\n", portSelect, "\n", bitRateInput );
		return;
	}
}


/****
	*	Add receive and receive error event listeners.
	*
	*	@param None
	*
	*	@return None
****/
function addEventListeners()
{
	serial.onReceive.addListener( onReceiveCallback );
	serial.onReceiveError.addListener( onReceiveErrorCallback );

	connectBtn.onclick = connect;
}


/****
	*	Callback function for getDevices. 
	*	Add available ports to the port select element.
	*
	*	@param ports 			A list of the open serial ports on the system.
	*
	*	@return None
****/
function onGetDevices( ports )
{
	let i;
	for( i = 0; i < ports.length; i++ )
	{
		let newOpt = document.createElement( "option" );

		newOpt.value = ports[ i ].path;
		newOpt.innerHTML = ports[ i ].path;
		
		portSelect.appendChild( newOpt );
	}
}


/****
	*	Callback function for connect.
	*	
	*
	*	@param connectionInfo 	Object containing information on the connected port. 
	*							Of type ConnectionInfo as defined in chrome.serial API.
	*
	*	@return None
****/
function connectCB( connectionInfo )
{
	// Log the connection information to the dev console.
	for( var prop in connectionInfo )
	{
		console.log( prop + ": " + connectionInfo[ prop ] );
	}
	console.log( "\n" );

	// Store the connection ID value.
	connectionID = connectionInfo.connectionId;

	// Update the connect button to be a disconnect button.
	connectBtn.innerHTML = "Disconnect";
	connectBtn.onclick = disconnect;
}


/****
	*	Callback function for disconnect.
	*	
	*
	*	@param result 			Boolean result of disconnect operation.
	*
	*	@return None
****/
function disconnectCB( result )
{
	console.log( "Disconnect Result: " + result );

	// Update the disconnect button to be a connect button.
	connectBtn.innerHTML = "Connect";
	connectBtn.onclick = connect;
}


/****
	*	Convert an ArrayBuffer to a String.
	*
	*	@param buffer 			Object of type ArrayBuffer.
	*
	*	@return str 			String representation of ArrayBuffer buffer.
****/
function arrayBufferToString( buffer )
{
	return String.fromCharCode.apply( String, new Uint8Array( buffer ) );
}


function onReceiveCallback( info )
{
	if( connectionID !== -1 && info.connectionId == connectionID && info.data )
	{
		// console.log( "info:");
		// console.log( info );
		let str = arrayBufferToString( info.data );

		let end = "";
		let clearConsole = false;
		log( str, end, clearConsole );
	}
	else
	{
		console.log( "Unknown Connection:" );
		console.log( info );
	}
}


function onReceiveErrorCallback( info )
{
	console.log( "Receive Error: " + info.error );
	console.log( info );
}


/****
	*	Log output onto the textarea console.
	*
	*	@param str 				String object with content to log.
	*	@param end 				Optional. How to end the print. Default '\n'.
	*	@param clear 			Optoinal. Boolean option to clear the output before printing.
	*
	*	@return None
****/
function log( str, end, clear )
{
	if( end === undefined )
		end = "\n";

	ta = document.getElementById( "console" );

	if( clear === true )
		ta.value = "";

	ta.value += str + end;
	ta.scrollTop = ta.scrollHeight;
}

function connect()
{
	connectionOptions.bitrate = Number( bitRateInput.value );	// Get bitrate value from input field.
	port = portSelect.value;									// Get port value from port select field.

	// Verify that the port has been selected (i.e., is not the empty value).
	if( port === "" )
	{
		log( "Invalid port selection." );
		return;
	}

	console.log( "Connection Options:\n", connectionOptions, "\n" );

	serial.connect( port, connectionOptions, connectCB );
}

function disconnect()
{
	serial.disconnect( connectionID, disconnectCB );
}
