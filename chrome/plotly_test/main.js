var lowInput = document.getElementById( "low" );
var highInput = document.getElementById( "high" );

TESTER = document.getElementById('tester');
Plotly.newPlot( TESTER, [{
x: [1, 2, 3, 4, 5],
y: [1, 2, 4, 8, 16] }], {
margin: { t: 0 } } );

let data = [ { 	y: [ Math.random(), Math.random(), Math.random() ],
				x: [ 1, 2, 3 ] } ];

setInterval( randomize, 100 );


function randomize() {
	let x = [], y = [];
	let low = parseInt( lowInput.value );
	let high = parseInt( highInput.value );
	let i;

	let xStr = "", yStr = "";
	for( i = low; i <= high; i++ )
	{
		x.push( i );

		let newVal = Math.random();

		y.push( newVal );

		xStr += i.toFixed( 2 ) + " ";
		yStr += newVal.toFixed( 2 ) + " ";
	}

	document.getElementById( "content" ).value = xStr + "\n" + yStr;

	data = [ { y: y, x: x } ];
	
	Plotly.relayout( 
		TESTER,
		{
			'xaxis.range': [ low, high ],
			'yaxis.range': [ 0, 1 ]
		}
	);

	Plotly.animate(TESTER, 
		{
			data: data,
			traces: [0],
			layout: {}
		}, 
		{
			transition: {
				duration: 10,
				easing: 'cubic-in-out'
			},
			frame: {
				duration: 500
		}
	} )
}

