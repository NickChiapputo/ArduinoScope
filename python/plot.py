import serial
import matplotlib.pyplot as plt
from matplotlib.widgets import Button
from matplotlib.ticker import ( MultipleLocator, FormatStrFormatter, AutoMinorLocator )
import numpy as np
import signal
import time
import sys


# Global variables.
paused = False 			# Flag for pausing the data output. Changes on pause button press.

'''
	Main oscilloscope routine. Called at program execution.

	@param 				None

	return 				None
'''
def oscilloscope():
	signal.signal( signal.SIGINT, signal_handler )						# Create handler for SIGINT interrupt signal.


	# Create sample frequency and rate.
	sampleFrequency = 50 												# Sampling frequency in Hz (samples per second).
	sampleRate = 1.0 / sampleFrequency									# Create rate in seconds by inverting frequency.


	# Arduino Parameters
	arduinoSampleFrequency = 1000
	arduinoSampleRate = 1.0 / arduinoSampleFrequency
	arduinoChannels = 2


	dataHistoryTimeLength = 5 											# Length of time data is stored in seconds.
	dataHistoryLength = dataHistoryTimeLength * arduinoSampleFrequency	# Create constant number of samples to store in history. Frame width in seconds can be calculated as ( dataHistoryLength / sampleFrequency ).
	data = np.zeros( ( arduinoChannels, dataHistoryLength ) )			# Create array to hold sample history for each channel.
	
	maxTime = dataHistoryLength * arduinoSampleRate						# Get the maximum time value for the X-axis.
	timeStep = arduinoSampleRate										# Get the time step size for input samples.
	timeset = np.arange( 0, maxTime, timeStep )							# Create X-axis ticks/labels.


	# Create plot parameters
	xlim = [ 0, dataHistoryLength * sampleRate ]
	ylim = [ 0, 5.1 ]
	xlabel = "Time (s)"
	ylabel = "Voltage (V)"
	title = "Oscilloscope"


	# Create the figure and plot the initial data (all zero line).
	fig, ax = initPlot( xlim = xlim, ylim = ylim, xlabel = xlabel, ylabel = ylabel, title = title )

	lines = []
	for i in range( 0, arduinoChannels ):
		line, = ax.plot( timeset, data[ i ] )
		lines.append( line )
	ax.margins( x = 0, y = 0 )
	ax.set_ylim( xlim )					# Set the Y-axis limits.
	ax.set_ylim( ylim )					# Set the X-axis limits.

	# Create pause button.
	axPause = plt.axes( [ 0.75, 0.05, 0.1, 0.075 ] )
	bPause = PauseButtonProcessor( axPause, "▌▌" )
	# bPause = Button( axPause, "Pause" )
	# bPause.on_clicked( pauseCallback )

	fig.subplots_adjust( bottom = 0.2 )


	# Reset the current axis.
	plt.sca( ax )


	# Serial communication parameters.
	baudrate = 115200												# Set the baudrate. Make sure this matches the Arduino program.
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
				print( "\r\033[K>> '{}' - {}".format( inputData, type( inputData ) ), end='' )


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

	ax.set_ylim( xlim )					# Set the Y-axis limits.
	ax.set_ylim( ylim )					# Set the X-axis limits.

	plt.xlabel( xlabel )				# Set the Y-axis label.
	plt.ylabel( ylabel )				# Set the X-axis label.

	plt.title( title )					# Set the plot title.

	plt.margins( x = 0, y = 0 )			# Remove margins between axes and plot area. Makes it look better.

	# ax.xaxis.set_major_locator( MultipleLocator( 50 ) )
	# ax.yaxis.set_major_locator( MultipleLocator( 0.5 ) )

	# ax.xaxis.set_minor_locator( MultipleLocator( 10 ) )
	# ax.yaxis.set_minor_locator( MultipleLocator( 0.1 ) )

	plt.grid( which = 'both', axis = 'both' )			# Display gridlines.

	plt.show( block = False )			# Show the figure. Set to non-blocking to allow continuous execution of the program (same as ion() basically). 

	return fig, ax 						# Return the figure and axes objects


'''
'''
def pauseCallback( event ):
	global paused
	paused = not paused
	print( "Pause: {}".format( paused ) )


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
	@param 	data 		The updated Y-axis data.
	@param 	paused 		Boolean flag. When true, figure is not updated.

	return 				None
'''
def updateGraph( fig, graphs, data, channels, paused ):
	if not paused:
		for i in range( 0, channels ):
			graphs[ i ].set_ydata( data[ i ] )	# Set the new Y-axis data.
	fig.canvas.flush_events()					# Flush the event pool and push the new data out.
	# plt.draw()									# Update (re-draw) the figure.


class PauseButtonProcessor():
	def __init__( self, axes, label ):
		self.button = Button( axes, label )
		self.button.on_clicked( self.process )

	def process( self, event ):
		global paused
		paused = not paused

		self.button.label.set_text( "►" if paused else "▌▌" )

		print( "Pause: {}".format( paused ) )


# Call main routine.
if __name__ == "__main__":
	oscilloscope()
