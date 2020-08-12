# Define the version of python to use.
PY = python3


# Define any flags to use.
PYFLAGS = 


# Define oscilloscope display sources.
OSC_SRC = python/plot.py


#### Define serial communication parameters ####
# Set baud rate to default 250,000 baud. Make sure this matches with the Arduino sketch
BAUD_RATE ?= 250000

# Set the port the Arduino is connected on.
PORT ?= "/dev/ttyACM0"
####


#### Define oscilloscope default parameters
# Define the refresh rate (FPS) for the display. Default: 15 FPS.
REFRESH ?= 15

# Define the number of channels. Important to match to the Arduino sketch. Default: 2.
N_CHANNELS ?= 2

# Define the sampling frequency (Hz) on the Arduino. Match this with the Arduino sketch.
# Must be accurate to ensure correct time display.
ARDUINO_SAMPLE_FREQ ?= 1000
####


# Define the arguments passed to the oscilloscope program.
OSC_ARG = $(BAUD_RATE) $(PORT) $(REFRESH) $(N_CHANNELS) $(ARDUINO_SAMPLE_FREQ)

# Run the oscilloscope display script.
oscilloscope: $(OSC_SRC)
	$(PY) $(OSC_SRC) $(OSC_ARG)
