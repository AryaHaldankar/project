async function submitForm(){
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    console.log('here');

    const data ={
        username:username,
        password:password
    }

    const resp = await fetch('/signin', {
        method:'POST',
        headers: {
            'Content-Type':'application/json'
        },
        body: JSON.stringify(data)
    })
    const response = await resp.json();
    if(response['status'] === false)
        document.getElementById('response').innerHTML = response.error;
    else
        window.location.href = '/homepage';
}