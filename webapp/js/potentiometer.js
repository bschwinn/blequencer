/**
 * @name		jQuery potentiometer plugin
 * @author		Brian Schwinn
 * @version 	1.0
 * @url			http://www.stingrayengineering.com/widgets/
 * @license		MIT License
 */

(function($){

	$.fn.potentiometer = function(props){

		var MAX_ROT = 315;

		var options = $.extend({
			min: 0,
			max: 11,
			value: 7,
			sensitivity: 0.01,
			rotate: function(){}
		}, props || {});

		var tpl = '<div class="_potentiometer">\
				<div class="_potentiometer_top"></div>\
				<div class="_potentiometer_base"></div>\
			</div>';

		return this.each(function(){

			var el = $(this);
			el.append(tpl);

			var pot = $('._potentiometer',el),
				potTop = pot.find('._potentiometer_top'),
				potBase = pot.find('._potentiometer_base'),
				startDeg = -1,
				currentDeg = 0,
				rotation = 0,
				lastDeg = 0,
				doc = $(document);

			pot.css('width', options.width);
			pot.css('height', options.height);
			potTop.css('width', options.width);
			potTop.css('height', options.height);
			potBase.css('width', options.width);
			potBase.css('height', options.height);

			// map value to rotation
			var initRat = 0;
			if ( options.value >= options.min && options.value <= options.max ) {
				initRat = (options.value-options.min) / (options.max - options.min)
			}

			var currentDeg = initRat * MAX_ROT;
			potTop.css('transform','rotate('+(currentDeg)+'deg)');
			options.turn(currentDeg/MAX_ROT);

			pot.on('mousedown', function(e){

				e.preventDefault();

				var initialVert = e.pageY;
				var calcRat;

				doc.on('mousemove.rem',function(e){

					var newVert = e.pageY;
					if ( newVert > initialVert) {
						calcRat = initRat - (options.sensitivity * (newVert - initialVert));
					} else {
						calcRat = initRat + (options.sensitivity * (initialVert - newVert));
					}

					if ( calcRat >= 1 ) {
						calcRat = 1;
					}
					if ( calcRat <= 0 ) {
						calcRat = 0;
					}
					currentDeg = calcRat * MAX_ROT;

					potTop.css('transform','rotate('+(currentDeg)+'deg)');
					options.turn(currentDeg/MAX_ROT);
				});

				doc.on('mouseup.rem',function(){
					doc.off('.rem');
					initRat = calcRat;
				});

			});
		});
	};

})(jQuery);
