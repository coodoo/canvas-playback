/*

- 目地
	- 實驗 canvas playback 的兩種模式
	- real time: 依畫筆真實速度重繪
	- fixed time: 依指定速度重繪

- 結果
	- 兩種模式皆成功

 */
'use strict';

var context = document.querySelector( '.drawBox' ).getContext( '2d' );
var canvas = document.querySelector( '.drawBox' );
context = canvas.getContext( '2d' );
context.strokeStyle = '#ff0000';
context.lineJoin = 'round';
context.lineWidth = 5;

var paint;
var arr = [];

// debug;
window.arr = arr;
window.redraw = redraw;

/**
 * Add information where the user clicked at.
 */
function addClick( x, y, dragging ) {
	arr.push( {
		x:x,
		y:y,
		dragging:dragging,
		time: performance.now() - downTime, // macro second
	});
}

let isPlaying = false;
let playStart;

// fixed, real
function replay( type, s ){
	read();

	stop();
	clear();

	isPlaying = true;
	playStart = performance.now();

	if( type == 'fixed' ){
		speed = 300/s;
		playFixed();
	}else{
		playReal();
	}

}

function stop(){
	isPlaying = false;
	clearInterval(drawId);
	window.cancelAnimationFrame(drawId);
}

let speed = 300;
let drawId;

function playFixed(){

	var gen = redraw(), result;

	drawId = setInterval(function(){

		result = gen.next();

		if(result.done || isPlaying == false){
			clearInterval(drawId);
			console.log( '畫完' );
		}

	}, speed)
}

function playReal(){
	drawId = window.requestAnimationFrame(tick);
	let playHead = 0;
	let item;


	function tick(t){
		t = t - playStart;
		// console.log( '\ntick: ', t );

		while( item = arr[playHead++] ){

			// 播完了
			if(!item){
				return window.cancelAnimationFrame(drawId);
			}

			if( item.time <= t ){
				// console.log( '中: ', item );
				redrawSingle( item, playHead );
			}else{
				// console.log( 'item 時間大於 t: ', item.time );
				playHead--;
				drawId = window.requestAnimationFrame(tick);
				break;
			}


		}

	}
}



function save(){
	localStorage.setItem('drawings', JSON.stringify(arr) );
}

function read(){
	if(localStorage.hasOwnProperty('drawings')){
		arr = JSON.parse(localStorage.getItem('drawings'));
	}else{
		arr = [];
	}

	if(arr.length == 0 ) console.log( '沒有繪圖資料，將無法重播' );
}

function clear(){
	// Clears the canvas
	context.clearRect( 0, 0, context.canvas.width, context.canvas.height );
}

/**
 * Redraw the complete canvas.
 */
function* redraw() {

	for ( var i = 0; i < arr.length; i += 1 ) {

		var item = arr[i];

		if ( !item.dragging && i == 0 ) {
			// 這是第一筆的開頭
			context.beginPath();
			context.moveTo( item.x, item.y );
			context.stroke();
		} else if ( !item.dragging && i > 0 ) {
			// 第一筆落下後畫到一半，鬆手後又繼續畫，這是第二筆的開頭
			context.closePath();

			context.beginPath();
			context.moveTo( item.x, item.y );
			context.stroke();
		} else {
			// 中間的移動過程
			context.lineTo( item.x, item.y );
			context.stroke();
		}

		yield;

	}
}

function redrawSingle( item, idx ) {

	if ( !item.dragging && idx == 0 ) {
		// 這是第一筆的開頭
		context.beginPath();
		context.moveTo( item.x, item.y );
		context.stroke();
	} else if ( !item.dragging && idx > 0 ) {
		// 第一筆落下後畫到一半，鬆手後又繼續畫，這是第二筆的開頭
		context.closePath();

		context.beginPath();
		context.moveTo( item.x, item.y );
		context.stroke();
	} else {
		// 中間的移動過程
		context.lineTo( item.x, item.y );
		context.stroke();
	}

}

/**
 * Draw the newly added point.
 * @return {void}
 */
function drawNew() {
	var item = arr[arr.length - 1];

	if ( item.dragging == false ) {

		if ( arr.length == 0 ) {
			// 第一筆落下
			context.beginPath();
			context.moveTo( item.x, item.y );
			context.stroke();
			console.log( '1' );
		} else {
			// 第二筆落下
			console.log( '2' );
			context.closePath();

			context.beginPath();
			context.moveTo( item.x, item.y );
			context.stroke();
		}
	} else {
		// 一般移動
		console.log( '3' );
		context.lineTo( item.x, item.y );
		context.stroke();
	}
}

let downTime;

// down 事件
function mouseDownEventHandler( e ) {
	paint = true;
	if(!downTime) downTime = performance.now();
	var x = e.pageX - canvas.offsetLeft;
	var y = e.pageY - canvas.offsetTop;
	if ( paint ) {
		addClick( x, y, false );
		drawNew();
	}
}

function touchstartEventHandler( e ) {
	paint = true;
	if ( paint ) {
		addClick( e.touches[0].pageX - canvas.offsetLeft, e.touches[0].pageY - canvas.offsetTop, false );
		drawNew();
	}
}

// up 時就是設定 paint 為 false
function mouseUpEventHandler( e ) {
	context.closePath();
	paint = false;

	save();
}


function mouseMoveEventHandler( e ) {
	var x = e.pageX - canvas.offsetLeft;
	var y = e.pageY - canvas.offsetTop;
	if ( paint ) {
		addClick( x, y, true );
		drawNew();
	}
}

function touchMoveEventHandler( e ) {
	if ( paint ) {
		addClick( e.touches[0].pageX - canvas.offsetLeft, e.touches[0].pageY - canvas.offsetTop, true );
		drawNew();
	}
}

function setUpHandler( isMouseandNotTouch, detectEvent ) {
	removeRaceHandlers();
	if ( isMouseandNotTouch ) {
		canvas.addEventListener( 'mouseup', mouseUpEventHandler );
		canvas.addEventListener( 'mousemove', mouseMoveEventHandler );
		canvas.addEventListener( 'mousedown', mouseDownEventHandler );
		mouseDownEventHandler( detectEvent );
	} else {
		canvas.addEventListener( 'touchstart', touchstartEventHandler );
		canvas.addEventListener( 'touchmove', touchMoveEventHandler );
		canvas.addEventListener( 'touchend', mouseUpEventHandler );
		touchstartEventHandler( detectEvent );
	}
}

function mouseWins( e ) {
	setUpHandler( true, e );
}

function touchWins( e ) {
	setUpHandler( false, e );
}

function removeRaceHandlers() {
	canvas.removeEventListener( 'mousedown', mouseWins );
	canvas.removeEventListener( 'touchstart', touchWins );
}

canvas.addEventListener( 'mousedown', mouseWins );
canvas.addEventListener( 'touchstart', touchWins );

// jx
function go2() {
	var canvas = document.querySelector( '.drawBox' );
	var ctx = canvas.getContext( '2d' );
	console.log( 'ctx: ', ctx );
	ctx.fillStyle = 'rgb(200,0,0)';
	ctx.fillRect( 10, 10, 55, 50 );

	ctx.beginPath();
	ctx.moveTo( 20, 20 );
	ctx.stroke();

	ctx.lineTo( 120, 120 );
	ctx.stroke();

	ctx.lineTo( 50, 50 );
	ctx.stroke();

	ctx.closePath();

	// ctx.lineStyle = "rgba(0, 0, 200, 0.5)";
	// var path=new Path2D();
	//     path.moveTo(40, 40);
	//     path.lineTo(60, 175);
	//     path.lineTo(120,20);
	//     ctx.fill(path);

	// ctx.fillStyle = "rgba(0, 0, 200, 0.5)";
	// ctx.fillRect (30, 30, 55, 50);
}
