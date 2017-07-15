const 	Alexa 		= require('alexa-sdk');
var 	request 	= require('request-promise');


//Remove prior to deployment
var 	fs 			= require('fs');

var properties
var APP_ID 		
var BASE_URL 	
var STOP_MSGE
var INVALID_LINE_ERR_MSG
var ALL_LINES_ERR_MSG
var NO_LINE_ERR_MSG
var HEADERS = {}

//Remove prior to deployment
fs.readFile('./cfgs/config.json', 'utf8', function(err,data){
	if (err) throw err;
	properties = JSON.parse(data);

	APP_ID 					= properties.AMAZON_OBJECT.APP_ID;
	BASE_URL 				= properties.API_OBJECT.BASE_URL;

	HEADERS.app_key 		= properties.API_OBJECT.app_key;
	HEADERS.app_id 			= properties.API_OBJECT.app_id;

	STOP_MSG 	 			= properties.CONSTANTS.STOP_MSG;
	NO_LINE_ERR_MSG 	 	= properties.CONSTANTS.NO_LINE_ERR_MSG;
	INVALID_LINE_ERR_MSG	= properties.CONSTANTS.INVALID_LINE_ERR_MSG;
	ALL_LINES_ERR_MSG		= properties.CONSTANTS.ALL_LINES_ERR_MSG
	//console.log(HEADERS)
	//console.log(BASE_URL)
	//console.log(APP_ID)
	//console.log(STOP_MESSAGE)
	getStatusUpdates().then(console.log).catch(console.log)
});


function getStatusUpdates(line){
	var url = BASE_URL + (line === undefined ? "Mode/tube/Status" : line + "/Status")
	var options = Object.assign({}, HEADERS, {url: url})
	
	return request(options)
		.then(body => {
			
			var groups = {}
			var data = JSON.parse(body);

			//Group line data by status
			(data).forEach(line => {
				var service = line.lineStatuses[0].statusSeverityDescription
				groups = (groups[service] === undefined ? Object.assign(groups, {[service]: []}) : groups)
				groups[service].push(line.name)

			});
			
			//Order grouped object by number of lines with each status: ASC
			var currentServiceTypes = Object.keys(groups).sort((a, b) => {return groups[a].length - groups[b].length})


			var sentence = []
			var service
			//classic for loop needed because of break statement
			for(var s_idx = 0; s_idx < currentServiceTypes.length; s_idx++){
				var service = currentServiceTypes[s_idx]
				var numLinesWithService = groups[service].length

				//allows for shrtened sentences, not explicitly listing each line
				if(line===undefined && s_idx === currentServiceTypes.length-1 && numLinesWithService > 1){
					sentence.push("You will find " + service + " on all" + (currentServiceTypes.length === 1 ? "": " other") + " London underground lines.");
					break;
				}

				groups[service].forEach((line, idx) => {
						sentence.push(idx === 0 ? "The " + line : line)
				})
		
				if(numLinesWithService > 0){
					sentence[sentence.length-1] = sentence[sentence.length-1] + ((numLinesWithService > 1 ? " Lines have " : " Line has ") + service + ".")
				}

			}
			return sentence.join(" ").replace(new RegExp('&', 'g'), 'and');
		})
		.catch(()=> { return line === undefined ? ALL_LINES_ERR_MSG : line.length > 0 ? line + INVALID_LINE_ERR_MSG + NO_LINE_ERR_MSG : NO_LINE_ERR_MSG });
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


