const 	Alexa 		= require('alexa-sdk');
var 	request 	= require('request-promise');


//Remove prior to deployment
var 	fs 			= require('fs');

var properties
var APP_ID 		
var BASE_URL 	
var STOP_MESSAGE
var HEADERS = {}

//Remove prior to deployment
fs.readFile('./cfgs/config.json', 'utf8', function(err,data){
	if (err) throw err;
	properties = JSON.parse(data);

	APP_ID 				= properties.AMAZON_OBJECT.APP_ID;
	BASE_URL 			= properties.API_OBJECT.BASE_URL;
	STOP_MESSAGE 		= properties.API_OBJECT.STOP_MESSAGE;
	HEADERS.app_key 	= properties.API_OBJECT.app_key;
	HEADERS.app_id 		= properties.API_OBJECT.app_id;
	//console.log(HEADERS)
	//console.log(BASE_URL)
	//console.log(APP_ID)
	//console.log(STOP_MESSAGE)
	//getStatusUpdates('Victoria').then(console.log)
});


function getStatusUpdates(line){
	var url = BASE_URL + (line === undefined ? "Mode/tube/Status" : line + "/Status")
	var options = Object.assign({}, HEADERS, {url: url})
	
	return request(options)
		.then(body => {
			
			var groups = {}
			var data = JSON.parse(body);

			(data).map(line => {
				var service = line.lineStatuses[0].statusSeverityDescription
				groups = (groups[service] === undefined ? Object.assign(groups, {[service]: []}) : groups)
				groups[service].push(line.name)

			});
			

			var sentence = []
			if(line === undefined && Object.keys(groups).length === 1){
				return "You will find " + Object.keys(groups)[0] + " on all london underground lines."
			}
			Object.keys(groups).map( (service, idx) => {

				var lines = groups[service].length
				groups[service].map(line => {
						sentence.push(idx === 0 ? "The " + line : line)
				})
		
				if(lines > 0){
					sentence.push((lines > 1 ? " Lines have " : " Line has ") + service + ".")
				}
				
			})
			return sentence.join(line === undefined? ", " : "").replace(new RegExp('&', 'g'), 'and');
		})
		.catch(()=> { return "error retriving journey status" });
}



var handlers = {
	   'LaunchRequest': function () {
        this.emit('GetStatusOfAllLines');
    },


    'AMAZON.CancelIntent': function () {
        this.emit(':tell', STOP_MESSAGE);
    },

    'AMAZON.StopIntent': function () {
        this.emit(':tell', STOP_MESSAGE);
    },

	GetStatusOfAllLinesIntent : function(){
		this.emit("GetStatusOfAllLines");
	},

	GetStatusOfAllLines : function () {
		getStatusUpdates().then(completeSentence => {
			this.emit(':tell', completeSentence);
		});
	},

	GetStatusOfLinesIntent: function() {
		this.emit("GetStatusOfLine");
	},

	GetStatusOfLines: function () {
		var line = this.event.request.intent.slots.Line.value;
		getStatusUpdates(line).then(completeSentence => {
			this.emit(':tell', completeSentence);
		});
	}

};




exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.APP_ID = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};


