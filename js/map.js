let yandexMap = null;
let placemarks = [];

const languageResources = [
    {
        id: 1,
        name: "Центральная библиотека иностранной литературы",
        address: "ул. Варварка, 10, Москва",
        hours: "10:00-20:00 (Вт-Вс)",
        phone: "+7 (495) 123-45-67",
        description: "Большая коллекция книг на иностранных языках, читальный зал, языковые кружки",
        type: "library",
        coords: [55.752, 37.623]
    },
    {
        id: 2,
        name: "Языковой клуб 'Полиглот'",
        address: "ул. Арбат, 25, Москва",
        hours: "12:00-22:00 (Пн-Пт), 14:00-23:00 (Сб-Вс)",
        phone: "+7 (495) 234-56-78",
        description: "Разговорные клубы, языковые вечера, встречи с носителями",
        type: "club",
        coords: [55.749, 37.591]
    },
    {
        id: 3,
        name: "Кафе языкового обмена 'Lingua Cafe'",
        address: "ул. Покровка, 15, Москва",
        hours: "8:00-23:00 (Ежедневно)",
        phone: "+7 (495) 345-67-89",
        description: "Кофе + практика языков, тематические вечера, языковые игры",
        type: "cafe",
        coords: [55.761, 37.647]
    },
    {
        id: 4,
        name: "Культурный центр 'Диалог культур'",
        address: "ул. Тверская, 8, Москва",
        hours: "9:00-21:00 (Пн-Сб)",
        phone: "+7 (495) 456-78-90",
        description: "Выставки, лекции, языковые курсы, культурные мероприятия",
        type: "center",
        coords: [55.764, 37.605]
    },
    {
        id: 5,
        name: "Частные курсы 'Speak Now'",
        address: "ул. Новый Арбат, 30, Москва",
        hours: "8:00-20:00 (Пн-Пт), 10:00-18:00 (Сб)",
        phone: "+7 (495) 567-89-01",
        description: "Индивидуальные и групповые занятия, подготовка к экзаменам",
        type: "courses",
        coords: [55.752, 37.589]
    },
    {
        id: 6,
        name: "Общественный центр 'Языковой мост'",
        address: "ул. Большая Дмитровка, 11, Москва",
        hours: "10:00-19:00 (Вт-Вс)",
        phone: "+7 (495) 678-90-12",
        description: "Бесплатные разговорные клубы, языковые тренинги",
        type: "public",
        coords: [55.758, 37.613]
    },
    {
        id: 7,
        name: "Университетские языковые курсы",
        address: "пр. Мира, 20, Москва",
        hours: "9:00-18:00 (Пн-Пт)",
        phone: "+7 (495) 789-01-23",
        description: "Академические курсы, подготовка преподавателей",
        type: "education",
        coords: [55.780, 37.630]
    }
];

const getIconForType = (type) => {
    const icons = {
        'library': 'islands#blueBookIcon',
        'club': 'islands#blueConversationIcon',
        'cafe': 'islands#blueCoffeeIcon',
        'courses': 'islands#blueEducationIcon',
        'center': 'islands#blueTheaterIcon',
        'education': 'islands#blueUniversityIcon',
        'public': 'islands#blueCommunityIcon'
    };
    return icons[type] || 'islands#blueCircleIcon';
};

function initMap() {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;
    
    if (typeof ymaps === 'undefined') {
        showMapPlaceholder();
        return;
    }
    
    ymaps.ready(() => {
        try {
            yandexMap = new ymaps.Map('map', {
                center: [55.7558, 37.6176],
                zoom: 11,
                controls: ['zoomControl', 'typeSelector', 'fullscreenControl']
            });
            
            addPlacemarks();
            
            const searchControl = new ymaps.control.SearchControl({
                options: {
                    float: 'right',
                    noPlacemark: true,
                    provider: 'yandex#search'
                }
            });
            
            yandexMap.controls.add(searchControl);
            
            searchControl.events.add('resultselect', (e) => {
                const index = e.get('index');
                searchControl.getResult(index).then(zoomToResult);
            });
            
            setupFilters();
            
        } catch (error) {
            showMapPlaceholder();
        }
    });
}

function addPlacemarks(filterType = 'all', searchText = '') {
    if (!yandexMap) return;
    
    yandexMap.geoObjects.removeAll();
    placemarks = [];
    
    const filtered = languageResources.filter(resource => {
        const matchesType = filterType === 'all' || resource.type === filterType;
        const matchesSearch = !searchText || 
            resource.name.toLowerCase().includes(searchText.toLowerCase()) ||
            resource.description.toLowerCase().includes(searchText.toLowerCase()) ||
            resource.type.toLowerCase().includes(searchText.toLowerCase());
        return matchesType && matchesSearch;
    });
    
    filtered.forEach(resource => {
        const placemark = new ymaps.Placemark(
            resource.coords,
            {
                balloonContentHeader: `<strong>${resource.name}</strong>`,
                balloonContentBody: `
                    <div style="max-width: 300px;">
                        <p><strong>Адрес:</strong> ${resource.address}</p>
                        <p><strong>Часы работы:</strong> ${resource.hours}</p>
                        <p><strong>Телефон:</strong> ${resource.phone}</p>
                        <p><strong>Тип:</strong> ${getRussianType(resource.type)}</p>
                        <p><strong>Описание:</strong> ${resource.description}</p>
                    </div>
                `,
                hintContent: resource.name
            },
            {
                preset: getIconForType(resource.type)
            }
        );
        
        yandexMap.geoObjects.add(placemark);
        placemarks.push(placemark);
    });
    
    updateCounter(filtered.length);
}

function getRussianType(type) {
    const types = {
        'library': 'Библиотека',
        'club': 'Языковой клуб',
        'cafe': 'Кафе языкового обмена',
        'courses': 'Языковые курсы',
        'center': 'Культурный центр',
        'education': 'Образовательное учреждение',
        'public': 'Общественный центр'
    };
    return types[type] || type;
}

function setupFilters() {
    const searchInput = document.getElementById('mapSearch');
    const filterSelect = document.getElementById('mapFilter');
    
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            addPlacemarks(filterSelect.value, this.value);
        });
    }
    
    if (filterSelect) {
        filterSelect.addEventListener('change', function() {
            addPlacemarks(this.value, searchInput ? searchInput.value : '');
        });
    }
}

function updateCounter(count) {
    const counter = document.getElementById('mapCounter') || createCounter();
    counter.textContent = `Найдено мест: ${count}`;
}

function createCounter() {
    const counter = document.createElement('div');
    counter.id = 'mapCounter';
    counter.className = 'mt-2 small text-secondary';
    document.querySelector('#map').parentNode.appendChild(counter);
    return counter;
}

function showMapPlaceholder() {
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        mapContainer.innerHTML = `
            <div style="padding: 30px; text-align: center; color: #666;">
                <h4>Карта учебных ресурсов</h4>
                <p>Языковые клубы, библиотеки, кафе для практики языков</p>
                
                <div class="row mt-4">
                    <div class="col-md-6">
                        <h5>Ресурсы:</h5>
                        <ul class="text-start">
                            <li>Центральная библиотека иностранной литературы</li>
                            <li>Языковой клуб "Полиглот"</li>
                            <li>Кафе языкового обмена "Lingua Cafe"</li>
                            <li>Культурный центр "Диалог культур"</li>
                            <li>Частные курсы "Speak Now"</li>
                        </ul>
                    </div>
                    <div class="col-md-6">
                        <h5>Фильтры:</h5>
                        <ul class="text-start">
                            <li>Образовательные учреждения</li>
                            <li>Общественные центры</li>
                            <li>Публичные библиотеки</li>
                            <li>Частные языковые курсы</li>
                            <li>Языковые кафе или клубы</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initMap, 1000);
});