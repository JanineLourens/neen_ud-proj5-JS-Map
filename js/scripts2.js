//Declare variable for global use.
var map;
var infoWindow;
var myLatLng;
/*
function loadScript() {

  //appends a script tag to the body of the document
  var script = document.createElement("script");
  script.type = "text/javascript";
  script.src = "https://maps.googleapis.com/maps/api/js?key=AIzaSyBcL043-9E7Z9-65z5oi-XyIzLFVcCdA9g&callback=foo";

  document.body.appendChild(script);
}

window.onload = loadScript;

function foo() {
    console.log('bar')
    setTimeout(function () {
        try{
            if (!google || !google.maps) {
                console.log('bar2')
                //This will Throw the error if 'google' is not defined
            }
        }
        catch (e) {
            alert('foo');
            //You can write the code for error handling here
            //Something like alert('Ah...Error Occurred!');
        }
    }, 200);
}
*/
function startMap() {
    initMap();
    google.maps.event.addDomListener(window, 'resize', centerMap);
    google.maps.event.addDomListener(window, 'load', centerMap);
}

function centerMap() {
    map.setCenter({ lat: 14.560517, lng: 120.989446 });
    map.setZoom(13);
}

//Create Instance of a map from the Google maps api
//Grab the reference to the "map-canvas" id to display map
//Set the map options object properties
function initMap() {
    map = new google.maps.Map(document.getElementById('map-canvas'), {
        center: { lat: 14.560517, lng: 120.989446 },
        zoom: 13,
        styles: styles,
        mapTypeControl: false
    });

    //bind the viewModel to the View after the gmaps has been created.
    bind();
    //create only one infowindow to display at a time when called, this is re assigned to different locations or markers upon click.
    infoWindow = new google.maps.InfoWindow();
};

var markersArray = [];
//Map Pin Constructor Function
var Pin = function(data) {
    var self = this;
    var pin;

    this.title = ko.observable(String(data.title));
    this.lat = ko.observable(data.location.lat);
    this.lng = ko.observable(data.location.lng);
    this.id = ko.observable(data.id)
    this.bizId = ko.observable(data.bizId);

    pin = new google.maps.Marker({
        position: new google.maps.LatLng(self.lat(), self.lng()),
        title: this.title(),
        animation: google.maps.Animation.DROP,
    });

    this.toggleBounce = function() {
         pin.setAnimation(google.maps.Animation.BOUNCE);
      setTimeout(function(){ pin.setAnimation(null); }, 1400);
      };

    pin.addListener('click', this.toggleBounce);
    var bI = data.bizId;
    markersArray.push(pin);
    //create an onClick event to open an infowindow at this pin.
    pin.addListener('click', function() {
        populateInfoWindow(this, infoWindow, bI);
    });

    this.isVisible = ko.observable(false);

    this.isVisible.subscribe(function(currentState) {
        if (currentState) {
            pin.setMap(map);
        } else {
            pin.setMap(null);
        }
    });

    this.isVisible(true);
};

// This function populates the infowindow when the marker is clicked. We'll only allow
// one infowindow which will open at the marker that is clicked, and populate based
// on that markers position.
function populateInfoWindow(marker, infowindow, bI) {
    // Check to make sure the infowindow is not already opened on this marker.
    if (infowindow.marker != marker) {
        infowindow.marker = marker;

        function nonce_generate() {
            return (Math.floor(Math.random() * 1e12).toString());
        }

        var yelp_url = 'https://api.yelp.com/v2/business/' + bI;
        var parameters = {
            cc: 'PH',

            oauth_consumer_key: 'hnJCok1xdi_Asm54Xqe2Xw',
            oauth_token: 'SsV8QvBUxHd22qVxqLvFJzv4YV7Sybkp',
            oauth_nonce: nonce_generate(),
            oauth_timestamp: Math.floor(Date.now() / 1000),
            oauth_signature_method: 'HMAC-SHA1',
            callback: 'cb'
        };

        var consumer_secret = 'JwVEkZdkAEL7h8Yq2mP0jD0dvSs',
            token_secret = 'Erp2WtAM_h_larpVREiyP7oPG_g';

        var encodedSignature = oauthSignature.generate('GET', yelp_url, parameters, consumer_secret, token_secret);

        parameters.oauth_signature = encodedSignature;

        var settings = {
            url: yelp_url,
            data: parameters,
            cache: true,
            dataType: 'jsonp',
            jsonpCallback: 'cb',
            success: function(response) {
                console.log("SUCCCESS! %o", response);
                bar = response;
                var yelpObj = {
                    iwUrl: response.url,
                    iwTitle: response.name,
                    iwAddress: arrayToString(response.location.display_address),
                    iwPic: response.image_url,
                    iwRating: response.rating_img_url_large,
                    iwPhone: response.display_phone,
                    iwReviews: response.review_count,
                    iwCuisines: response.categories[0][0]
                }

                var finalHTML = createContent(yelpObj);

                infowindow.setContent('<div>' + finalHTML + '</div>');

                map.panTo(marker.getPosition())
                infowindow.open(map, marker);

                // Make sure the marker property is cleared if the infowindow is closed.
                infowindow.addListener('closeclick', function() {
                    infowindow.marker = null;
                });

            },
            error: function(error) {
                alert('Unable to fetch Yelp data');

                infowindow.setContent('<div>' + 'Unable to Fetch YelpData' + '</div>');

                map.panTo(marker.getPosition())
                infowindow.open(map, marker);

                // Make sure the marker property is cleared if the infowindow is closed.
                infowindow.addListener('closeclick', function() {
                    infowindow.marker = null;
                });
            }
        };

        $.ajax(settings).done(function(){
            //alert('done fetching data!');
        }).fail(function(){
            alert('Unable to fetch Yelp data');
        });
    }

}

var mapViewModel = function() {

    //ensures that 'self-this maps to the current method'
    var self = this;
    //Create a new blank array for all the listing markers.
    self.pins = ko.observableArray([]);

    //iterates through the mapModel and creates a new pin for each item in the mapmodel and pushes them into the markers array.
    this.createPins = function() {
        //TODO  turn into for loop to allow 'i' to use as
        for (var i = 0; i < mapModel.length; i++) {
            var markerItem = mapModel[i];
            var x = new Pin(markerItem);
            self.pins.push(x);
        };

        console.log("pinsCreated")
    }

    createPins();

    this.getPlace = function(data) {
        var thisPlaceID = data.id();
        var thisPlaceBizID = data.bizId();

        var thisMarker = markersArray[thisPlaceID]

        thisMarker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(function(){ thisMarker.setAnimation(null); }, 1400);

        console.log(thisMarker);
        populateInfoWindow(thisMarker, infoWindow, thisPlaceBizID);
    }

    //Search bar functionality
    this.match = ko.observable(true);
    this.query = ko.observable('');

    this.filterPins = ko.computed(function() {
        var search = self.query().toLowerCase();

        //this array filter checks if the condition is true or false; function(pin) is the condition, what matches.
        //loops through the pins and returns true or false depending if the search string is part of the pin.title()
        //filter is an array containing pins that match your search term
        var filter = ko.utils.arrayFilter(self.pins(), function(pin) {
            var doesMatch = pin.title().toLowerCase().indexOf(search) >= 0;

            pin.isVisible(doesMatch)
            return doesMatch;
        });
        //empty location to display
        var emptyLocation = {
            title: 'No Matched Location Found',
            location: {
                lat: 40.7713024,
                lng: -73.9632393
            },
            map: null,
            id: 999
        };

        if (filter.length === 0) {
            self.match(false);
            return [emptyLocation];
        } else {
            self.match(true);
            return filter;
        }

    });

};

//binds the mapViewModel to the view
//is only called after the gmaps API url callback
function bind() {
    ko.applyBindings(mapViewModel);
}

