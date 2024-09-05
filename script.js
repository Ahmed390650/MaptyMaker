'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
class Workout {
  id = Date.now();
  clicks = 0;
  date = new Intl.DateTimeFormat('eng', { month: 'long' }).format(new Date());
  static workouts = [];
  constructor(coords) {
    this.distance = +inputDistance.value;
    this.duration = +inputDuration.value;
    this.coords = coords;
  }

  _setDescription() {
    this.description = `${this.type} on ${this.date}`;
  }
  _addWorkout(workout) {
    Workout.workouts.push(workout);
    this._setLocalStorage();
  }
  _removeWorkout() {
    Workout.workouts = Workout.workouts.filter(
      workout => workout.id != this.id
    );
    this._setLocalStorage();
  }
  _editWorkout() {
    this._removeWorkout();
    this._setLocalStorage();
  }
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(Workout.workouts));
  }
}

class Running extends Workout {
  type = Running.name;
  constructor(coords, cadence) {
    super(coords);
    this.cadence = +inputCadence.value;
    this.calPace();
    this._setDescription();
    this._addWorkout(this);
  }
  calPace() {
    this.pace = this.duration / this.distance;
    return this;
  }
}

class Cycling extends Workout {
  type = Cycling.name;
  constructor(coords, elevationGain) {
    super(coords);
    this.elevationGain = +inputElevation.value;
    this.calSpeed();
    this._setDescription();
    this._addWorkout(this);
  }
  calSpeed() {
    this.speed = this.distance / (this.duration / 60);
  }
}

class App {
  #map;
  #mapEvent;
  #mapZoomOut = 13;
  workouts = [];
  constructor() {
    this._getPosition();
    this._getLocalStorage();
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField.bind(this));
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }
  _moveToPopup(e) {
    const workoutEle = e.target.closest('.workout');
    if (!workoutEle) return;
    const id = +workoutEle.dataset.id;
    const workout = Workout.workouts.find(wo => wo.id === id);
    if (e.target.classList.contains('Edit_button')) {
      this.#mapEvent = workout.coords;
      workout._removeWorkout();
      workoutEle.remove();
      this._showForm();
    } else if (e.target.classList.contains('delete_button')) {
      workoutEle.remove();
    } else {
      this.#map.setView(workout.coords, this.#mapZoomOut, {
        animate: true,
        pam: {
          duration: 1,
        },
      });
    }
  }
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._loadPage.bind(this), e =>
        console.error(e.message)
      );
    }
  }
  _loadPage(poistion) {
    const { latitude, longitude } = poistion.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomOut);
    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    this.#map.on('click', this._showForm.bind(this));
    L.marker(coords)
      .addTo(this.#map)
      .bindPopup('A pretty CSS popup.<br> Easily customizable.')
      .openPopup();
    this.workouts.forEach(workout => {
      this._renderWorkoutMake(workout);
    });
  }
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _toggleElevationField(e) {
    this.Type = e.target.value;
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _newWorkout(e) {
    e.preventDefault();
    let workout;
    const { lat, lng } = this.#mapEvent.latlng;
    if (inputType.value === Running.name) {
      const cadence = +inputCadence.value;
      workout = new Running([lat, lng], cadence);
    } else if (inputType.value === Cycling.name) {
      const elevation = inputElevation.value;
      workout = new Cycling([lat, lng], elevation);
    }
    this._renderWorkoutMake(workout);
    this._renderWorkout(workout);
    this._clearForm();
  }
  _clearForm() {
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => {
      form.style.display = 'grid';
    }, 1000);
  }
  _renderWorkoutMake({ coords, type, description }) {
    L.marker(coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 250,
          autoClose: false,
          closeOnClick: false,
          className: `${type}-popup`,
        })
      )
      .setPopupContent(description)
      .openPopup();
  }
  _renderWorkout({
    type,
    description,
    distance,
    duration,
    id,
    pace,
    cadence,
    speed,
    elevationGain,
  }) {
    let html = `<li class="workout workout--${type}" data-id=${id} >
          <div class="workout_tit">
          <h2  class="workout__title">${description}</h2>
          <button class="delete_button button">Delete</button>
          <button class="Edit_button button">Edit</button>
          </div>
          <div class="workout__details">
            <span class="workout__icon">${
              type === Running.name ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${distance.toFixed(1)}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${duration}</span>
            <span class="workout__unit">min</span>
          </div>`;
    if (type === Running.name) {
      html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
          </li>`;
    } else {
      html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${speed}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>`;
    }
    form.insertAdjacentHTML('afterend', html);
  }
  _getLocalStorage() {
    this.workouts = JSON.parse(localStorage.getItem('workouts')) || [];
    this.workouts = this.workouts.map(workout => {
      let modelClass;
      if (workout.type === Running.name) {
        modelClass = new Running();
      } else {
        modelClass = new Cycling();
      }
      Object.assign(modelClass, workout);
      this._renderWorkout(workout);
      return modelClass;
    });
  }
}
const AppObj = new App();
