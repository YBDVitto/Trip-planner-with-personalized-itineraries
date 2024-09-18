import { db, auth } from './firebase.js';
import { doc, collection, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js"
const mapsApiKey = 'AIzaSyBGaEPd6t_7_ezCxZoQwNiUcJDVnPsFaec';
let latUser;
let lonUser;
let userPosition;
let map;
let html = ''
document.addEventListener("click", (e) => {
    if (e.target.id === "search-btn") {
        const destination = document.getElementById("destination-input").value;
        window.open(`itineraries.html?destination=${encodeURIComponent(destination)}&latUser=${latUser}&lonUser=${lonUser}`, '_blank');
    }
})



window.addEventListener("storage", (e) => {
    // questa funzione viene eseguita quando si verifica una modifica in un'altra finestra
    //o tab del browser che condivide lo stesso dominio della pagina in qui è questa funzione
    // se la modifica a localStorage viene eseguita nella finestra corrent questa funzione
    // non verrà eseguita
    e.preventDefault()
    // e.key rappresenta la chiave del localStorage modificato
    // e.newValue rappresenta il valoroe del localStorage modificato
    if(e.key === 'savedRoute' && e.newValue === 'true') {
        window.location.reload()
        localStorage.removeItem('savedRoute')
    }
})

onAuthStateChanged(auth, (user) => {
    if(user) {
        if(localStorage.getItem('savedRoute') === 'true') {
            window.location.reload()
        }
        localStorage.removeItem('savedRoute')
        getSelectedRoutes(user.uid)
    } else {
        console.log("nessun utente caricato")
        window.location.href = 'login.html'
    }
})

async function getSelectedRoutes(userId) {

    const savedRoutesRef = collection(db, 'users', userId, 'savedRoutes')
    const snapShot = await getDocs(savedRoutesRef)
    snapShot.forEach((doc) => {
        displaySavedRoutes(doc.data())
    })
}

function displaySavedRoutes(data) {
    data = [data]
    let routeSelected
    data.forEach(route => {
        routeSelected = route
        html+=`
                    <div style="margin: 10px;" class="search-route-name">
                        <div style="
                            display: flex; 
                            flex-direction: column; 
                            align-items: center; 
                            justify-content: center; 
                            max-width: 100%; 
                            margin: auto; 
                            text-align: center;
                            padding: 15px;
                            border: 1px solid #ddd;
                            border-radius: 5px;
                            background: white;
                            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                        ">
                            <img src="${route.photo}" alt="${route.name}" style="
                                width: 200px; 
                                height: auto; 
                                border-radius: 5px; 
                                object-fit: cover; 
                                margin-bottom: 10px;
                            ">
                            <div>
                                <h4 style="font-size: 18px; margin: 0; color: black;" >${route.name}</h4>
                                <h3 style="margin: 5px 0; color: #555;">${route.vicinity}</h3>
                                <p style="margin: 0; color: #f4b400;">${route.rating || 'N/A'}</p>
                            </div>
                            <button class="delete-saved-route">DELETE TRIP</button>
                        </div>
                    </div>
                    `
    })
    document.getElementById("saved-routes-list").innerHTML = html

    let locationName

    document.querySelectorAll(".search-route-name").forEach(route => {
        route.addEventListener("click", (e) => {
            e.preventDefault()
            if(e.target.classList[0] !== "delete-saved-route") {
                let chosenPlacePosition
                locationName = routeSelected.name
                
                const locationGeocoder = new google.maps.Geocoder()
                locationGeocoder.geocode({address: locationName}, (results, status) => {
                    if(status === google.maps.GeocoderStatus.OK) {
                        
                        chosenPlacePosition = results[0].geometry.location
                        window.open(`itineraries.html?destination=${encodeURIComponent(locationName)}&latUser=${latUser}&lonUser=${lonUser}&lat=${chosenPlacePosition.lat()}&lng=${chosenPlacePosition.lng()}`, '_blank');
                    } else {
                        locationName = routeSelected.vicinity
                        locationGeocoder.geocode({address: locationName}, (results, status) => {
                            if(status === google.maps.GeocoderStatus.OK) {
                                chosenPlacePosition = results[0].geometry.location
                                window.open(`itineraries.html?destination=${encodeURIComponent(locationName)}&latUser=${latUser}&lonUser=${lonUser}&lat=${chosenPlacePosition.lat()}&lng=${chosenPlacePosition.lng()}`, '_blank');
                            }
                        })    
                        console.error("Impossibile trovare il luogo selezionato in base al nome.")
                    }
                })
            }
            
            
        })
    })

    document.querySelectorAll(".delete-saved-route").forEach((deleteRoute) => {
        deleteRoute.addEventListener("click", async (e) => {
            e.preventDefault()
            try {
            const userId = auth.currentUser.uid
            const deleteElement = deleteRoute.closest('.search-route-name').querySelector("h4").textContent
            const routeRef = doc(db, 'users', userId, 'savedRoutes', deleteElement)
            await deleteDoc(routeRef)
            deleteRoute.parentElement.remove()
            console.log("Elemento rimosso con successo dal database.")
            } catch {
                console.log(deleteElement)
                console.error("Impossibile rimuovere l'elemento dal databse.")
            }
        })
    })
}

document.getElementById("logout-btn").addEventListener("click", (e) => {
    e.preventDefault()
    auth.signOut().then(() => {
        alert("Now you are logged out.")
        window.location.href = 'login.html'
    })
    .catch(err => console.log("Errore durante il logout dell'utente: ", err))

})

document.getElementById("delete-all-routes").addEventListener("click", async (e) => {
    e.preventDefault()
    const userId = auth.currentUser.uid
    const routesRef = collection(db, 'users', userId, 'savedRoutes')
    const snapShot = await getDocs(routesRef)
    const deleteRoutes = snapShot.docs.map((document) => deleteDoc(document.ref))
    try {
        await Promise.all(deleteRoutes)
        window.location.reload(true)
    } catch (error){
        console.error("Errore durante la rimozione delle Saved Routes: ", error)
    }
})

function loadGoogleMapsPlacesApi() {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsApiKey}&libraries=places&callback=initMap`;
    script.defer = true;
    script.async = true;
    document.body.appendChild(script);
}

// Definisci initMap nel contesto globale
window.initMap = function() {
    getUserCoordinates();
}

function getUserCoordinates() {
    navigator.geolocation.getCurrentPosition(position => {
        latUser = position.coords.latitude;
        lonUser = position.coords.longitude;

        let options = {
            zoom: 8,
            center: {
                lat: latUser,
                lng: lonUser
            }
        };
        map = new google.maps.Map(document.getElementById("map"), options);

        new google.maps.Marker({
            position: {
                lat: latUser,
                lng: lonUser
            },
            map: map
        });

        // Crea un oggetto LatLng con le coordinate dell'utente
        const userLatLng = new google.maps.LatLng(latUser, lonUser);

        // Trova luoghi turistici vicino alla posizione dell'utente
        findNearbyPlaces(userLatLng);
    }, error => {
        console.error('Errore nel recupero della posizione:', error);
    });
}

function findNearbyPlaces(userLatLng) {
    // Configura una mappa invisibile
    map = new google.maps.Map(document.createElement('div'));

    const options = {
        location: userLatLng,
        radius: 4000,
        type: ['tourist_attraction']
    };

    const service = new google.maps.places.PlacesService(map);

    service.nearbySearch(options, handleResults);
}



function handleResults(results, status) {
    if (status === google.maps.places.PlacesServiceStatus.OK) {
        const placesContainer = document.getElementById('popular-places');
        placesContainer.innerHTML = ''; // Pulisce il contenitore
        results.forEach(place => {
            const placePosition = place.geometry.location;
            new google.maps.Marker({
                position: placePosition,
                map: map
            });

            // Crea un elemento per ogni luogo
            const placeElement = document.createElement('div');
            placeElement.classList.add('place');

            // Nome del luogo
            const placeName = document.createElement('h3');
            placeName.textContent = place.name;
            placeElement.appendChild(placeName);

            // Immagine del luogo
            if (place.photos && place.photos.length > 0) {
                const placeImage = document.createElement('img');
                placeImage.src = place.photos[0].getUrl({ maxWidth: 400, maxHeight: 300 });
                placeElement.appendChild(placeImage);
            } else {
                const noImage = document.createElement('p');
                noImage.textContent = 'Nessuna immagine disponibile';
                placeElement.appendChild(noImage);
            }

            // Indirizzo del luogo
            const placeAddress = document.createElement('p');
            placeAddress.textContent = place.vicinity || 'Nessun indirizzo disponibile';
            placeElement.appendChild(placeAddress);

            // Punteggio del luogo
            if (place.rating) {
                const placeRating = document.createElement('p');
                placeRating.textContent = `Rating: ${place.rating} ⭐`;
                placeElement.appendChild(placeRating);
            }

            // Aggiungi l'elemento al contenitore
            placesContainer.appendChild(placeElement);
        });
    } else {
        console.error('Errore nel recupero dei luoghi:', status);
    }
}



loadGoogleMapsPlacesApi();

