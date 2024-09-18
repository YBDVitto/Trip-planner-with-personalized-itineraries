import { db, auth } from "./firebase.js";
import { doc, setDoc } from 'https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore.js';

const destination = getQueryParam("destination");
const latUser = getQueryParam("latUser");
const lonUser = getQueryParam("lonUser");
const mapsApiKey = 'AIzaSyBGaEPd6t_7_ezCxZoQwNiUcJDVnPsFaec';
let map;
let directionsRenderer;
let directionsService;
let selectedDestination;
let waypoints = [];
let selectedRoute = {};
let markers = [];
let userMarker = null;  // Aggiungi questo per gestire il marker dell'utente
let watchId;

document.getElementById("destination-header").textContent = destination;

// Ottiene i parametri dall'URL
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Carica la Google Maps API
function loadGoogleMapsPlacesApi() {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsApiKey}&libraries=places,geocoding&callback=initMap`;
    script.defer = true;
    script.async = true;
    document.body.appendChild(script);
}

// Inizializza la mappa e i servizi di Google Maps
window.initMap = function() {
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();

    const userLocation = { lat: parseFloat(latUser), lng: parseFloat(lonUser) };
    const options = {
        center: userLocation,
        zoom: 8
    };
    map = new google.maps.Map(document.getElementById("destination-map"), options);
    directionsRenderer.setMap(map);

    // Imposta la destinazione iniziale
    if (destination) {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: destination }, (results, status) => {
            if (status === google.maps.GeocoderStatus.OK) {
                selectedDestination = results[0].geometry.location;
                addMarker(selectedDestination, destination);
                calculateRoute(); // Calcola il percorso iniziale
            } else {
                console.error('Geocoding fallito:', status);
            }
        });
    }

    // Avvia la ricerca dei luoghi vicini e ascolta il cambio di categoria
    setupCategoryChangeListener();
}

// Inizia a monitorare la posizione dell'utente e crea il marker blu
function startTrackingPosition() {
    if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
            position => {
                const currentUserLat = position.coords.latitude;
                const currentUserLng = position.coords.longitude;

                const newUserLocation = {
                    lat: currentUserLat,
                    lng: currentUserLng
                };

                // Se il marker dell'utente non esiste, crealo
                if (!userMarker) {
                    userMarker = new google.maps.Marker({
                        position: newUserLocation,
                        map: map,
                        title: 'La tua posizione attuale',
                        icon: {
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 7,
                            fillColor: '#0000FF',
                            fillOpacity: 1,
                            strokeWeight: 2,
                            strokeColor: '#FFFFFF'
                        }
                    });
                } else {
                    // Altrimenti, aggiorna la posizione del marker esistente
                    userMarker.setPosition(newUserLocation);
                }

                // Ricalcola il percorso in base alla nuova posizione dell'utente
                calculateRoute(newUserLocation);
            },
            error => {
                console.error("Errore nel monitoraggio della posizione: ", error);
            },
            {
                enableHighAccuracy: true
            }
        );
    }
}

// Ferma il monitoraggio della posizione dell'utente
function stopTrackingPosition() {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null; // Resetta il watchId
    }

    // Rimuove il marker blu dalla mappa quando il monitoraggio è fermo
    if (userMarker) {
        userMarker.setMap(null);
        userMarker = null;
    }
}

document.getElementById("start-trip-btn").addEventListener("click", (e) => {
    e.preventDefault();
    startTrackingPosition();
});

document.getElementById("stop-trip-btn").addEventListener("click", (e) => {
    e.preventDefault();
    stopTrackingPosition();
});

// Aggiunge un marker sulla mappa
function addMarker(position, title) {
    const marker = new google.maps.Marker({
        position: position,
        map: map,
        title: title
    });
    markers.push(marker);
}

// Aggiunge una nuova destinazione e ricalcola il percorso
document.getElementById("search-btn").addEventListener("click", () => {
    const newDestination = document.getElementById("newDestination").value;
    addNewDestination(newDestination);
});

function addNewDestination(newDestination) {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: newDestination }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK) {
            const destinationCoords = results[0].geometry.location;

            // Aggiungi la destinazione precedente ai waypoints, se esiste
            if (selectedDestination) {
                waypoints.push({
                    location: selectedDestination,
                    stopover: true
                });
            }

            // Aggiorna la nuova destinazione selezionata
            selectedDestination = destinationCoords;

            // Ricalcola il percorso con i nuovi waypoints
            calculateRoute();

            // Cerca i luoghi vicini nella nuova destinazione
            const category = document.getElementById("category-select").value.toLowerCase();
            searchPlaces(category);
        } else {
            console.error('Geocoding fallito:', status);
        }
    });
}

document.getElementById("travel-mode").addEventListener("change", (e) => {
    e.preventDefault();
    calculateRoute();
});

// Funzione per calcolare il percorso con i waypoints
function calculateRoute(userLocation = { lat: parseFloat(latUser), lng: parseFloat(lonUser) }) {
    const transportMode = document.getElementById("travel-mode").value || "DRIVING";

    const request = {
        origin: userLocation, // Usa la posizione corrente dell'utente
        destination: selectedDestination,
        waypoints: waypoints,
        travelMode: google.maps.TravelMode[transportMode.toUpperCase()],
        optimizeWaypoints: true
    };

    directionsService.route(request, (results, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
            // Calcola la durata totale in minuti
            const totalDurationMinutes = results.routes[0].legs.reduce((acc, leg) => acc + leg.duration.value, 0) / 60;

            // Calcola le ore e i minuti
            const hours = Math.floor(totalDurationMinutes / 60);
            const minutes = Math.round(totalDurationMinutes % 60);

            // Mostra la durata totale in ore e minuti
            document.getElementById("trip-duration").textContent = `Durata totale: ${hours} ore e ${minutes} minuti`;

            // Mostra il percorso sulla mappa
            directionsRenderer.setDirections(results);
        } else {
            console.error('Errore nel calcolo del percorso:', status);
            document.getElementById("trip-duration").textContent = 'Impossibile calcolare il percorso.';
        }
    });
}

// Imposta il listener per il cambio di categoria
function setupCategoryChangeListener() {
    document.getElementById("category-select").addEventListener("change", () => {
        const category = document.getElementById("category-select").value.toLowerCase();
        if (selectedDestination) {
            searchPlaces(category);
        }
    });
}

// Funzione per cercare i luoghi vicini
function searchPlaces(type) {
    markers.forEach(marker => marker.setMap(null)); // Rimuovi marker precedenti
    markers = [];

    const request = {
        location: selectedDestination,
        radius: 5000,
        type: [type]
    };

    const service = new google.maps.places.PlacesService(map);
    service.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            results.forEach(place => {
                const marker = new google.maps.Marker({
                    position: place.geometry.location,
                    map: map
                });

                let photoUrl = '';
                if (place.photos && place.photos.length > 0) {
                    photoUrl = place.photos[0].getUrl({ width: 200 });
                    selectedRoute.photo = photoUrl;
                } else {
                    photoUrl = 'https://via.placeholder.com/200';
                }

                const infoWindowContent = `
                    <div style="max-width: 200px;">
                        <h4 style="font-weight: bold; margin: 0; font-size: 16px;">${place.name}</h4>
                        <p style="margin: 5px 0; color: #555;">${place.vicinity}</p>
                        <p style="margin: 0; color: #f4b400;">⭐ ${place.rating || 'N/A'}</p>
                    </div>
                `;

                const infoWindow = new google.maps.InfoWindow({
                    content: infoWindowContent
                });

                marker.addListener("click", () => {
                    selectedDestination = place.geometry.location;
                
                    calculateRoute(); // Ricalcola il percorso
                
                    infoWindow.open(map, marker);
                    setTimeout(() => {
                        infoWindow.close();
                    }, 2000);
                
                    // Se l'hotel è selezionato, aggiorna selectedRoute con le informazioni
                    if (document.getElementById("category-select").value === "hotel") {
                        selectedRoute.isSelectedHotel = true;
                    }
                    selectedRoute.name = place.name;
                    selectedRoute.vicinity = place.vicinity;
                    selectedRoute.rating = `${place.rating} ⭐`;
                    selectedRoute.placeId = place.place_id
                
                
                    // Mostra i dettagli del posto selezionato e il link di prenotazione
                    document.getElementById("selected-place").innerHTML = `
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; max-width: 100%; margin: auto; text-align: center; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background: white; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
                            <img src="${photoUrl}" alt="${place.name}" style="width: 200px; height: auto; border-radius: 5px; object-fit: cover; margin-bottom: 10px;">
                            <div>
                                <h4 style="font-size: 18px; margin: 0; color: black;">${place.name}</h4>
                                <p style="margin: 5px 0; color: #555;">${place.vicinity}</p>
                                <p style="margin: 0; color: #f4b400;">⭐ ${place.rating || 'N/A'}</p>
                            </div>
                        </div>
                    `;
                });
                markers.push(marker);
            });
        } else {
            console.error('Errore nel recupero dei luoghi:', status);
        }
    });
}

// Salva il percorso su Firebase
document.getElementById("save-route-btn").addEventListener("click", async () => {
    try {
        console.log(selectedRoute)
        // Controllo se selectedRoute è valido
        if (selectedRoute && selectedRoute.name && selectedRoute.vicinity) {
            const userId = auth.currentUser.uid;
            console.log(userId)
            const routeRef = doc(db, 'users', userId, 'savedRoutes', selectedRoute.name);
            
            await setDoc(routeRef, selectedRoute);
            // Imposta il percorso salvato in localStorage
            localStorage.setItem("savedRoute", "true");

            // Mostra un alert
            alert('Percorso salvato con successo!');
        } else {
            alert('Seleziona un percorso da salvare.');
        }
    } catch (error) {
        console.error("Errore durante il salvataggio del percorso: ", error);
        alert('Si è verificato un errore durante il salvataggio del percorso. Riprova.');
    }
})

loadGoogleMapsPlacesApi();