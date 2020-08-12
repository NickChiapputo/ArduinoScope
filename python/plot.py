import serial
import matplotlib.pyplot as plt
from matplotlib.widgets import Button
from matplotlib.ticker import ( MultipleLocator, FormatStrFormatter, AutoMinorLocator )
import numpy as np
import signal
import time
import sys


# Global variables.
paused = False 						# Flag for pausing the data output. Changes on pause button press.
updateDivisions = False 			# Flage for updating the division display on the scope. Set after a secs/div or volts/div button press.


# Oscilloscope parameters. Need to be global so the input objects can adjust them.
numDivisions = 5					# Number of divisions per quadrant. Total vertical/horizontal divisions is twice this number.

# Create lists of valid options for secs/div and volts/div.
timeStepOptions = [ 0.01, 0.05, 0.1, 0.5, 1, 2, 5 ]		# Seconds
voltStepOptions = [ 0.01, 0.05, 0.1, 0.5, 1, 2, 5 ]		# Volts

timeStepIndex = 5
timeStep = timeStepOptions[ timeStepIndex ] 	# Seconds per division (sec/div).
timeOffset = 10									# Movement left/right on X-axis.

voltStepIndex = 3
voltStep = timeStepOptions[ voltStepIndex ]  	# Volts per division (volts/div).
voltOffset = 0									# Movement up/down on X-axis



'''
	Main oscilloscope routine. Called at program execution.

	@param 				None

	return 				None
'''
def oscilloscope():
	signal.signal( signal.SIGINT, signal_handler )						# Create handler for SIGINT interrupt signal.


	# Create sample frequency and rate.
	sampleFrequency = 15 												# Sampling frequency in Hz (samples per second).
	sampleRate = 1.0 / sampleFrequency									# Create rate in seconds by inverting frequency.


	# Arduino Parameters
	arduinoSampleFrequency = 1000
	arduinoSampleRate = 1.0 / arduinoSampleFrequency
	arduinoChannels = 2


	# Initialize data and timeset buffers.
	numTimeDivs = 2 * numDivisions * timeStep							# Calculate the number of time divisions displayed on the scope.
	dataHistoryLength = int( numTimeDivs * arduinoSampleFrequency )		# Create constant number of samples to store in history. Store arduinoSampleFrequency samples per time division. This keeps a consistent data density.
	data = np.zeros( ( arduinoChannels, dataHistoryLength ) )			# Create array to hold sample history for each channel.
	print( "Data size: {}".format( dataHistoryLength ) )
	
	timeRange = dataHistoryLength * arduinoSampleRate					# Calculate the amount of time data will be held for.
	minTime = -( timeRange / 2 ) + timeOffset 							# Calculate the minimum time by taking the negative half of the range and offsetting it.
	maxTime =  ( timeRange / 2 ) + timeOffset 							# Calculate the maximum time by taking the positive half of the range and offsetting it.
	timeset = np.arange( minTime, maxTime, arduinoSampleRate )			# Create X-axis (time) data.


	# Oscilloscope parameters

	# Create plot parameters
	xlim = [ -( numDivisions * timeStep ) + timeOffset, numDivisions * timeStep + timeOffset ]
	ylim = [ -( numDivisions * voltStep ) + voltOffset, numDivisions * voltStep + voltOffset ]
	xlabel = "Time (s)"
	ylabel = "Voltage (V)"
	title = "Nicktronix"


	# Create the figure and plot the initial data (all zero line).
	fig, ax = initPlot( xlim = xlim, ylim = ylim, xlabel = xlabel, ylabel = ylabel, title = title )

	lines = []
	for i in range( 0, arduinoChannels ):
		line, = ax.plot( timeset, data[ i ] )
		lines.append( line )
	ax.margins( x = 0, y = 0 )


	# Add the oscilloscope input buttons (volts/div and secs/div changes and volt/secs offset).
	# Need to capture the return value (list of the created buttons) because we are required to 
	# maintain a reference to them for them to remain responsive.
	buttons = addOscilloscopeInputs( fig )

	# Reset the current axis.
	plt.sca( ax )


	# Serial communication parameters.
	baudrate = 250000												# Set the baudrate. Make sure this matches the Arduino program.
	port = "/dev/ttyACM0"											# Set the port the Arduino is connected to. /dev/ttyACMx for Linux and COMx for Windows.
	cereal = serial.Serial( port = port, baudrate = baudrate )		# Create the serial communication object.


	lastCheck = time.time()											# Set the initial check time.
	starttime = lastCheck

	index = 0														# Counter to keep track of frames if we want that information.


	# Infinite loop until the SIGINT interrupt signal is received.
	while True:
		# Only read in the data at the sample rate. This prevents slowdown of the display.
		if cereal.in_waiting:
			inputData = ( cereal.read_until() )[ : -2 ]				# Read in the data and remove the carriage return and newline bytes.


			# Try to execute this block.
			# There are some scenarios where the data is malformed and can't be parsed.
			# This try-except block catches those scenarios.
			try:
				inputData = inputData.decode( "ASCII" )	# Take the bytes input data, decode into ASCII format and convert to a floating-point value.
				inputData = inputData.split( " " )

				# Convert each data point into a floating-point value.
				# Do this before updating the lists in case one of them is faulty.
				# This keeps the data lined up.
				for i in range( 0, arduinoChannels ):
					inputData[ i ] = float( inputData[ i ] )


				# Print out the current reading.
				# print( "\r\033[K>> '{}' - {}".format( inputData, type( inputData ) ), end='' )


				# Update each channel's data.
				for i in range( 0, arduinoChannels ):
					# Slide all the data back one slot and then 
					# add the new data point to the most recent slot.
					data[ i ] = rotateLeftNPositions( data[ i ], 1 )		# Rotate the data to the left by one position
					data[ i ][ dataHistoryLength - 1 ] = inputData[ i ]		# Add the new data point at the right-most data location.


				# timeset = rotateLeftNPositions( timeset, 1 )
				# timeset[ dataHistoryLength - 1 ] = timeset[ dataHistoryLength - 2 ] + ( inputData[ 1 ] / 1000.0 )

				# print( "Timeset: {}\nData: {}".format( timeset, data ) )


				# This is more of a circular buffer. It probably
				# executes faster, but the output is less intuitive
				# than the rotating implementation.
				# data[ index ] = float( inputData )
				# index = ( index + 1 ) % dataHistoryLength


				# Print out the data to be plotted.
				# This output probably slows it down quite a bit
				# and isn't strictly necessary unless you want
				# the exact values.
				# print( data )


				# Update the graph (when not paused) with the new data and X-axis labels.
				# Update at a frame rate of sampleRate frames per second.
				if ( time.time() - lastCheck ) > sampleRate:
					index = index + 1											# Increment frame count.
					lastCheck = time.time()										# Update the last frame update time.
					updateGraph( fig, lines, data, arduinoChannels, paused )	# Update the plot.


				# Update the plot divisions if the update flag is set after a button press.
				global updateDivisions
				if updateDivisions:
					updateDivisions = False


					# Initialize data and timeset buffers.
					numTimeDivs = 2 * numDivisions * timeStep							# Calculate the number of time divisions displayed on the scope.
					dataHistoryLength = int( numTimeDivs * arduinoSampleFrequency )		# Create constant number of samples to store in history. Store arduinoSampleFrequency samples per time division. This keeps a consistent data density.
					data = np.zeros( ( arduinoChannels, dataHistoryLength ) )			# Create array to hold sample history for each channel.
					print( "Data size: {}".format( dataHistoryLength ) )
					
					timeRange = dataHistoryLength * arduinoSampleRate					# Calculate the amount of time data will be held for.
					minTime = -( timeRange / 2 ) + timeOffset 							# Calculate the minimum time by taking the negative half of the range and offsetting it.
					maxTime =  ( timeRange / 2 ) + timeOffset 							# Calculate the maximum time by taking the positive half of the range and offsetting it.
					timeset = np.arange( minTime, maxTime, arduinoSampleRate )			# Create X-axis (time) data.

					# Create plot parameters
					xlim = [ -( numDivisions * timeStep ) + timeOffset, numDivisions * timeStep + timeOffset ]
					ylim = [ -( numDivisions * voltStep ) + voltOffset, numDivisions * voltStep + voltOffset ]

					ax.set_xlim( xlim )
					ax.set_ylim( ylim )

					ax.xaxis.set_major_locator( MultipleLocator( timeStep ) )
					ax.yaxis.set_major_locator( MultipleLocator( voltStep ) )

					for i in range( 0, arduinoChannels ):
						lines[ i ].set_data( timeset, data[ i ] )

					fig.canvas.flush_events()					# Flush the event pool and push the new data out.


			except Exception as e:
				# Print out the error text and the value of the input data
				print( "Error: '{}'. {}\r".format( inputData, str( e ) ), end='\n' )

			# cereal.reset_input_buffer()								# Flush
	# print( "Frames in 20 seconds: {}.".format( index ) )


'''
	Initialize the oscilloscope view. By default, it shows 0 V to 5 V and 100 samples.

	@param 	xlim		List object with two values that represents the X-axis limits. [ xmin, xmax ]
	@param 	ylim		List object with two values that represents the Y-axis limits. [ ymin, ymax ]
	@param 	xlabel		String object for the X-axis label.
	@param 	ylabel		String object for the Y-axis label.
	@param 	title 		String object for the figure title.

	return 			Figure and axes objects for the created window and plot.
'''
def initPlot( xlim = [ 0, 100 ], ylim = [ 0, 5.1 ], xlabel = "Sample", ylabel = "Voltage (V)", title = "Oscilloscope" ):
	plt.ion()							# Turn interactive mode on. This allows the plot to go into the background.

	fig = plt.figure()					# Get the figure object.

	ax = plt.subplot( 1, 1, 1 )			# Create a plot.

	ax.set_xlim( xlim )					# Set the Y-axis limits.
	ax.set_ylim( ylim )					# Set the X-axis limits.

	# Create tick steps based on
	# secs/div and volts/div. 
	ax.xaxis.set_major_locator( MultipleLocator( timeStep ) )
	ax.yaxis.set_major_locator( MultipleLocator( voltStep ) )

	plt.xlabel( xlabel )				# Set the Y-axis label.
	plt.ylabel( ylabel )				# Set the X-axis label.

	plt.title( title )					# Set the plot title.

	plt.margins( x = 0, y = 0 )			# Remove margins between axes and plot area. Makes it look better.

	plt.grid( which = 'both', axis = 'both' )			# Display gridlines.

	plt.show( block = False )			# Show the figure. Set to non-blocking to allow continuous execution of the program (same as ion() basically). 

	return fig, ax 						# Return the figure and axes objects


'''
	Add the oscilloscope input buttons to the figure.
	Adding secs/div and volt/div increase and decrease buttons.
	Adding voltage and seconds offset buttons.
	Adding labels for all four sets of buttons.

	@param 	fig 		The figure object that contains the oscilloscope view.

	return 				List of components created for the figure. Have to keep a reference to them for them to remain responsive.
'''
def addOscilloscopeInputs( fig ):
	# Create labels for button sets.
	fig.text( 0.90, 0.825, "secs/div", 			horizontalalignment = "center", verticalalignment = "center" )
	fig.text( 0.90, 0.625, "volt/div", 			horizontalalignment = "center", verticalalignment = "center" )
	fig.text( 0.90, 0.425, "Time Offset", 		horizontalalignment = "center", verticalalignment = "center" )
	fig.text( 0.90, 0.225, "Voltage Offset", 	horizontalalignment = "center", verticalalignment = "center" )

	# Create pause button.
	axPause = plt.axes( [ 0.75, 0.05, 0.1, 0.075 ] )
	bPause = ButtonProcessor( axPause, "▌▌", "pause" )

	# Create secs/div increase/decrease step buttons.
	axTimeStepIncrease = plt.axes( [ 0.83, 0.75, 0.05, 0.04 ] )
	axTimeStepDecrease = plt.axes( [ 0.92, 0.75, 0.05, 0.04 ] )

	bTimeStepIncrease = ButtonProcessor( axTimeStepIncrease, "+", "timeStepUp"   )
	bTimeStepDecrease = ButtonProcessor( axTimeStepDecrease, "-", "timeStepDown" )

	# Create volt/div increase/decrease step buttons.
	axVoltStepIncrease = plt.axes( [ 0.83, 0.55, 0.05, 0.04 ] )
	axVoltStepDecrease = plt.axes( [ 0.92, 0.55, 0.05, 0.04 ] )

	bVoltStepIncrease = ButtonProcessor( axVoltStepIncrease, "+", "voltStepUp"   )
	bVoltStepDecrease = ButtonProcessor( axVoltStepDecrease, "-", "voltStepDown" )

	# Create secs/div increase/decrease offset buttons.
	axTimeIncrease = plt.axes( [ 0.83, 0.35, 0.05, 0.04 ] )
	axTimeDecrease = plt.axes( [ 0.92, 0.35, 0.05, 0.04 ] )

	bTimeIncrease = ButtonProcessor( axTimeIncrease, "+", "timeUp"   )
	bTimeDecrease = ButtonProcessor( axTimeDecrease, "-", "timeDown" )

	# Create volt/div increase/decrease offset buttons.
	axVoltIncrease = plt.axes( [ 0.83, 0.15, 0.05, 0.04 ] )
	axVoltDecrease = plt.axes( [ 0.92, 0.15, 0.05, 0.04 ] )

	bVoltIncrease = ButtonProcessor( axVoltIncrease, "+", "voltUp"   )
	bVoltDecrease = ButtonProcessor( axVoltDecrease, "-", "voltDown" )

	fig.subplots_adjust( bottom = 0.2, right = 0.8 )


	# Return references to the buttons. This is required for them to remain responsive in the figure.
	return [ bTimeStepIncrease, bTimeStepDecrease, bVoltStepIncrease, bVoltStepDecrease, bTimeIncrease, bTimeDecrease, bVoltIncrease, bVoltDecrease ]


'''
	SIGINT interrupt signal handler. Exit the program.

	@param 	sig 		The signal to handle.
	@param 	frame

	return 				None
'''
def signal_handler( sig, frame ):
	# Display exit string. 
	# Escape command \033[K to clear the entire row and return to beginning for clean output.
	print( "\r\033[KExiting..." )	
	
	plt.close()		# Close the plot window.
	sys.exit( 0 )	# Exit the program.


'''
	Rotate list to the left n positions.

	@param 	list 		An ndarray object of size at least n.
	@param 	n 			The number of places to rotate left by. Must be less than or equal to the size of list.

	return 				The rotated list.
'''
def rotateLeftNPositions( list, n ):
	# list[ n : ] returns the values after the first n values. In other words, the last ( list.size() - n ) values.
	# list[ : n ] returns the first n values.
	return np.concatenate( ( list[  n : ], list[ : n ] ) )


'''
	Redraw the graph with new data.

	@param 	fig 		The figure object that contains the plot.
	@param 	graph 		The Line2D object that contains the previous data.
	@param 	data 		2-Dimensional array containing the updated Y-axis data. Each row is a different channel.
	@param 	channels 	Number of channels the plot contains.
	@param 	paused 		Boolean flag. When true, figure is not updated.

	return 				None
'''
def updateGraph( fig, graphs, data, channels, paused ):
	if not paused:
		for i in range( 0, channels ):
			graphs[ i ].set_ydata( data[ i ] )	# Set the new Y-axis data.
	fig.canvas.flush_events()					# Flush the event pool and push the new data out.


'''
	Object representing the oscilloscope buttons.
	By creating an object, the button is more easily able
	to access its own attributes and it nicely encapsulates
	its functionality.
'''
class ButtonProcessor():
	'''
		Initialization function for the button.

		@self 			The button object. This is not used as an argument when creating the object.
		@axes 			The axes object where the button is located.
		@label 			The text label on the button.
		@btnType		String representing the type of button. Valid options are:
							"pause"
							"timeStepUp"
							"timeStepDown"
							"voltStepUp"
							"voltStepDown"
							"timeUp"
							"timeDown"
							"voltUp"
							"voltDown"

		return 			None
	'''
	def __init__( self, axes, label, btnType ):
		self.button = Button( axes, label )				# Create the button object with the given axes location and label text.
		self.btnType = btnType							# Set the button type.

		self.button.on_clicked( self.processAction )	# Add a callback function for the on_click action.


	'''
		Click event handler. Actions depend on the button type that was clicked.
		Handle division size and offset increase/decrease for voltage and time.
		Handle pause/unpause scope view.

		@param self 	The button object.
		@param event 	Event object. Represents the type of event that occured.

		return 			None
	'''
	def processAction( self, event ):
		# Define the global parameters for use within this scope

		# Update the paused flag if the button is the pause button.
		global paused
		paused = ( not paused ) if self.btnType == "pause" else paused
		
		global timeStepOptions
		global timeStepIndex
		global timeStep
		
		global timeOffset
		
		global voltStepOptions
		global voltStepIndex
		global voltStep

		global voltOffset


		# Set the update divisions flag to change the scope view if the button is not the pause button
		global updateDivisions
		updateDivisions = True if self.btnType != "pause" else False

		# Switch on the button type, perform relevent actions.

		# If pause button, flip the pause flag and change the label text to match.
		if self.btnType == "pause":
			paused = not paused
			self.button.label.set_text( "►" if paused else "▌▌" )

			print( "Pause: {}".format( paused ) )

		# If the secs/div increase button, change the time step value.
		elif self.btnType == "timeStepUp":
			timeStepIndex = ( len( timeStepOptions ) - 1 ) if ( ( timeStepIndex + 1 ) >= len( timeStepOptions ) ) else ( timeStepIndex + 1 )

			timeStep = timeStepOptions[ timeStepIndex ]

			print( "Increase Time Step: {}".format( timeStep ) )

		# If the secs/div decrease button, change the time step value.
		elif self.btnType == "timeStepDown":
			timeStepIndex = 0 if ( ( timeStepIndex - 1 ) < 0 ) else ( timeStepIndex - 1 )
			timeStep = timeStepOptions[ timeStepIndex ]

			print( "Decrease Time Step: {}".format( timeStep ) )

		# If the volt/div increase button, change the volt step value.
		elif self.btnType == "voltStepUp":
			voltStepIndex = ( len( voltStepOptions ) - 1 ) if ( ( voltStepIndex + 1 ) >= len( voltStepOptions ) ) else ( voltStepIndex + 1 )
			voltStep = voltStepOptions[ voltStepIndex ]

			print( "Increase Volt Step: {}".format( voltStep ) )

		# If the volt/div decrease button, change the volt step value.
		elif self.btnType == "voltStepDown":
			voltStepIndex = 0 if ( ( voltStepIndex - 1 ) < 0 ) else ( voltStepIndex - 1 )
			voltStep = voltStepOptions[ voltStepIndex ]

			print( "Decrease Volt Step: {}".format( voltStep ) )

		# If the time offset increase button, increase the time offset value by the time step amount.
		elif self.btnType == "timeUp":
			timeOffset = timeOffset + timeStep

			print( "Increase Time Offset: {}".format( timeOffset ) )

		# If the time offset decrease button, decrease the time offset value by the time step amount.
		elif self.btnType == "timeDown":
			timeOffset = timeOffset - timeStep

			print( "Decrease Time Offset: {}".format( timeOffset ) )

		# If the volt offset increase button, increase the volt offset value by the volt step amount.
		elif self.btnType == "voltUp":
			voltOffset = voltOffset + voltStep

			print( "Increase Volt Offset: {}".format( voltOffset ) )

		# If the volt offset decrease button, decrease the volt offset value by the volt step amount.
		elif self.btnType == "voltDown":
			voltOffset = voltOffset - voltStep

			print( "Decrease Volt Offset: {}".format( voltOffset ) )


	'''
		Click event handler for the pause button. Toggle the oscilloscope pause feature.

		@param self 	The button object.
		@param event 	Event object. Represents the type of event that occured.

		return 			None
	'''
	def processPause( self, event ):
		global paused
		paused = not paused

		self.button.label.set_text( "►" if paused else "▌▌" )

		print( "Pause: {}".format( paused ) )

	'''
		Click event handler for the time division step increase.

		@param self 	The button object.
		@param event 	Event object. Represents the type of event that occured.

		return 			None
	'''
	def processTimeStepUp( self, event ):
		global timeStepOptions
		global timeStepIndex
		global timeStep

		timeStepIndex = ( len( timeStepOptions ) - 1 ) if ( ( timeStepIndex + 1 ) >= len( timeStepOptions ) ) else ( timeStepIndex + 1 )

		timeStep = timeStepOptions[ timeStepIndex ]

		print( "Increase Time Step: {}".format( timeStep ) )

		global updateDivisions
		updateDivisions = True

	'''
		Click event handler for the time division step decrease.

		@param self 	The button object.
		@param event 	Event object. Represents the type of event that occured.

		return 			None
	'''
	def processTimeStepDown( self, event ):
		global timeStepOptions
		global timeStepIndex
		global timeStep

		timeStepIndex = 0 if ( ( timeStepIndex - 1 ) < 0 ) else ( timeStepIndex - 1 )
		timeStep = timeStepOptions[ timeStepIndex ]

		print( "Decrease Time Step: {}".format( timeStep ) )

		global updateDivisions
		updateDivisions = True

	'''
		Click event handler for the volt division step increase.

		@param self 	The button object.
		@param event 	Event object. Represents the type of event that occured.

		return 			None
	'''
	def processVoltStepUp( self, event ):
		global voltStepOptions
		global voltStepIndex
		global voltStep

		voltStepIndex = ( len( voltStepOptions ) - 1 ) if ( ( voltStepIndex + 1 ) >= len( voltStepOptions ) ) else ( voltStepIndex + 1 )

		voltStep = voltStepOptions[ voltStepIndex ]

		print( "Increase Volt Step: {}".format( voltStep ) )

		global updateDivisions
		updateDivisions = True

	'''
		Click event handler for the volt division step decrease.

		@param self 	The button object.
		@param event 	Event object. Represents the type of event that occured.

		return 			None
	'''
	def processVoltStepDown( self, event ):
		global voltStepOptions
		global voltStepIndex
		global voltStep

		voltStepIndex = 0 if ( ( voltStepIndex - 1 ) < 0 ) else ( voltStepIndex - 1 )
		voltStep = voltStepOptions[ voltStepIndex ]

		print( "Decrease Volt Step: {}".format( voltStep ) )

		global updateDivisions
		updateDivisions = True


	'''
		Click event handler for the time division offset increase.

		@param self 	The button object.
		@param event 	Event object. Represents the type of event that occured.

		return 			None
	'''
	def processTimeUp( self, event ):
		global timeStep
		global timeOffset

		timeOffset = timeOffset + timeStep

		print( "Increase Time Offset: {}".format( timeOffset ) )

		global updateDivisions
		updateDivisions = True


	'''
		Click event handler for the time division offset decrease.

		@param self 	The button object.
		@param event 	Event object. Represents the type of event that occured.

		return 			None
	'''
	def processTimeDown( self, event ):
		global timeStep
		global timeOffset

		timeOffset = timeOffset - timeStep

		print( "Decrease Time Offset: {}".format( timeOffset ) )

		global updateDivisions
		updateDivisions = True


	'''
		Click event handler for the volt division offset increase.

		@param self 	The button object.
		@param event 	Event object. Represents the type of event that occured.

		return 			None
	'''
	def processVoltUp( self, event ):
		global voltStep
		global voltOffset

		voltOffset = voltOffset + voltStep

		print( "Increase Volt Offset: {}".format( voltOffset ) )

		global updateDivisions
		updateDivisions = True


	'''
		Click event handler for the volt division offset decrease.

		@param self 	The button object.
		@param event 	Event object. Represents the type of event that occured.

		return 			None
	'''
	def processVoltDown( self, event ):
		global voltStep
		global voltOffset

		voltOffset = voltOffset - voltStep

		print( "Decrease Volt Offset: {}".format( voltOffset ) )

		global updateDivisions
		updateDivisions = True


# Call main routine.
if __name__ == "__main__":
	oscilloscope()
