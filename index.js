
document.addEventListener("DOMContentLoaded", displayAllCountry);

const lazyload = new LazyLoad();


function search(btn) {
  const h2 = btn.parentNode;
  const before = h2.outerHTML;
  
  h2.outerHTML = `
    <div>
      <input type="text" id="search-input" placeholder="Country name"/>
      <button id="search-close"><iconify-icon data-icon="uil:x" style="font-size:1.3em;"></iconify-icon></button>
    </div>
  `;
  
  const input = el("#search-input");
  
  input.focus();
  
  el("#search-close").onclick = function() {
    
    this.parentNode.outerHTML = before;
    const ul = el("#country-list"),
          li = ul.getElementsByTagName("li");
          
    for (i = 0; i < li.length; i++) li[i].style.display = null;
    
  };
  
  input.onkeyup = function() {
    
    const filter = this.value.toLowerCase(),
          ul = el("#country-list"),
          li = ul.getElementsByTagName("li");
    
    for (i = 0; i < li.length; i++) {
      const countryName = li[i].getElementsByTagName("span")[0].textContent;
      if (countryName.toLowerCase().indexOf(filter) > -1) {
        li[i].style.display = null;
      } else {
        li[i].style.display = "none";
      }
    }
    
  };
  
}


function displayAllCountry() {
  
  loading();
  
  if (storage("countries")) {
    const countries = JSON.parse(storage("countries"));
    countries.forEach(c => {
      addCountry(c.name, c.alpha3Code, c.flag);
    });
    unloading();
    lazyload.update();
    return;
  }
  
  const xhr = new XMLHttpRequest();
 
  xhr.onreadystatechange = function() {
    // res is ready
    if (this.readyState == 4) {
      if (this.status == 200) {
        const countries = [];
        const res = JSON.parse(this.responseText);
        res.forEach(({ name, alpha3Code, flag }) => {
          addCountry(name, alpha3Code, flag);
          countries.push({name,alpha3Code,flag});
        });
        storage("countries", JSON.stringify(countries));
      } else {
        fetchFailed("countries",_ => {
          displayAllCountry();
        });
      }
      unloading();
      lazyload.update();
    }
  };
  
  xhr.open("GET", "https://restcountries.eu/rest/v2/all", true);
  xhr.send();
  
}


function addCountry(name, iso3, flag) {
  const list = el("#country-list");
  list.innerHTML += `
    <li class="country-item" id="${iso3}" onclick="viewCountryData(this);">
      <img src="" data-src="${flag}" class="country-flag lazy" alt="flag"/>
      <span class="country-name">${name}</span>
    </li>
  `;
}


function getCountryData(iso3, callback) {
  
  loading();
  const xhr = new XMLHttpRequest();
  
  xhr.onreadystatechange = function() {
    if (this.readyState == 4) {
      unloading();
      if (this.status == 200) {
        callback(JSON.parse(this.responseText));
      } else if (this.status == 404) {
        callback(null);
      } else {
        callback(404);
        fetchFailed("country data",_ => {
          getCountryData(iso3, callback);
        });
      }
    }
  };
  
  xhr.open("GET", "https://disease.sh/v3/covid-19/countries/"+iso3, true);
  xhr.send();
    
}


function viewCountryData(li) {
  
  const dataDiv = el("#country-data");
  const { x, y } = li.getBoundingClientRect();
 
  const div = document.createElement("div");
  div.className = "overlay overlay-animate";
  div.style.left = `50%`;
  div.style.top = `${y}px`;
  div.style.transform = `translate(-50%, -${y}px)`;
  
  document.body.appendChild(div);
  
  const countryDiv = el("#country-active");
  const countryFlag = li.children[0].src,
        countryName = li.children[1].textContent;
  
  setTimeout(_ => {
    dataDiv.style.display = "block";
    countryDiv.innerHTML = `
      <img src="${countryFlag}" class="country-flag" alt="flag"/>
      <span class="country-name">${countryName}</span>
    `;
    div.classList.remove("overlay-animate");
    div.remove();
  }, 700);
 
  getCountryData(li.id, data => {
    
    const crd = el(".crd"),
          p = el("#data-updated");
         
    if (data == 404) {
      
      crd.innerHTML = "";
      p.textContent = "";
    
    } else if (data) {
      
      crd.innerHTML = `
        <h3 class="title">Total</h3>
        <div class="total-data">
          <div class="cases">
            <p>${numf(data.cases)}</p>
            <small>CASES</small>
          </div>
          <div class="recovered">
            <p>${numf(data.recovered)}</p>
            <small>RECOVERED</small>
          </div>
          <div class="deaths">
            <p>${numf(data.deaths)}</p>
            <small>DEATHS</small>
          </div>
        </div>
        <h3 class="title">Today</h3>
        <div class="today-data">
          <div class="cases">
            <p>${numf(data.todayCases)}</p>
            <small>CASES</small>
          </div>
          <div class="recovered">
            <p>${numf(data.todayRecovered)}</p>
            <small>RECOVERED</small>
          </div>
          <div class="deaths">
            <p>${numf(data.todayDeaths)}</p>
            <small>DEATHS</small>
          </div>
        </div>
      `;
      
      p.style.marginTop = "10%";
      p.textContent = "Updated "+timeDifference(data.updated);
   
    } else {
      
      crd.innerHTML = "";
      p.style.marginTop = "50%";
      p.textContent = "No data.";
      
    }
    
   
    el(".crd-close").addEventListener("click", function() {
      const ff = el(".fetch-failed");
      const div = this.parentNode;
      if (ff) ff.remove();
      div.classList.add("slide-down");
      setTimeout(_ => {
        div.classList.remove("slide-down");
        crd.innerHTML = "";
        p.textContent = "";
        div.style.display = null;
      }, 300);
    });
    
    function numf(x) {
      return Number((x).toFixed(1)).toLocaleString();
    }
  
  });
}



function fetchFailed(type, callback) {
  const div = document.createElement("div");
  div.className = "fetch-failed";
  
  const p = document.createElement("p");
  p.textContent = `Failed to fetch ${type}.`;
  
  const btn = document.createElement("button");
  btn.textContent = "RETRY";
  btn.onclick = function() {
    this.parentNode.remove();
    callback();
  };
  
  div.appendChild(p);
  div.appendChild(btn);
  
  if (el(".fetch-failed")) return;
  
  document.body.appendChild(div);
}



function timeDifference(previous) {

  const msPerMinute = 60 * 1000;
  const msPerHour = msPerMinute * 60;
  const msPerDay = msPerHour * 24;
  const msPerMonth = msPerDay * 30;
  const msPerYear = msPerDay * 365;

  const elapsed = Date.now() - previous;

  if (elapsed < msPerMinute) return Math.round(elapsed/1000) + ' seconds ago.';   
  
  if (elapsed < msPerHour) return Math.round(elapsed/msPerMinute) + ' minutes ago.';   
  
  if (elapsed < msPerDay ) {
    const hours = Math.round(elapsed/msPerHour);
    return hours == 1 ? `${hours} hour ago.` : `${hours} hours ago.`;   
  }
  
  if (elapsed < msPerMonth) {
    const days = Math.round(elapsed/msPerDay);
    return days == 1 ? `${days} day ago.` : `${days} days ago.`;  
  }

  if (elapsed < msPerYear) return Math.round(elapsed/msPerMonth) + ' months ago.';   
  
  return Math.round(elapsed/msPerYear ) + ' years ago.';
}

function loading() {
  const div = document.createElement("div");
  div.className = "loader";
  
  document.body.appendChild(div);
}

function unloading() {
  el(`div.loader`).remove();
}

function storage(key, val) {
  return val ? localStorage.setItem(key, val) : localStorage.getItem(key);
}

function el(el) {
  return document.querySelector(el);
}

