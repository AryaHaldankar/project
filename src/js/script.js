async function myFunction(){
    let city = document.getElementById('request').value;
    city = city.charAt(0).toUpperCase() + city.slice(1);
    const resp = await fetch('/makeRequest',{
        method:'POST',
        headers:{
            'Content-Type':'application/json'
        },
        body:JSON.stringify({city:city})
    })
    if(resp.ok){
        const response = await resp.json();
        document.getElementById('answer').innerHTML = `<img class = "fit-image" src = "${response.icon}"></img>`;
        document.getElementById('answerforecast').innerHTML = `The weather of ${city} is ${response.text}`;
    }
    else{
        document.getElementById('answer').innerHTML = `<img class = "fit-image" src = "https://media.makeameme.org/created/file-not-found-c17b083c9c.jpg"></img>`;
        document.getElementById('answerforecast').innerHTML = `No such place in our database. Try again...`;
    }
}

function login(){
    window.location.href = '/login';
}

function signin(){
    window.location.href = '/signinpage';
}

async function logout(){
    await fetch('/logout',{method:'DELETE'});
    window.location.href = '/homepage';
}