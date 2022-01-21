require("dotenv").config();
const querystring = require("querystring");
const express = require("express");
const axios = require("axios");
const uuid = require("uuid");
const cookieParser = require("cookie-parser");
const app = express();


//Fake Database ( a list ) --> just to check whether the user details retrived already exists or not
const fakeDB = [{userName: "Satabrata Paul",userEmail: "xyz123@gmail.com",userId: "d6759724-e522-41f8-89a5-43cc47870aca"}]

//Function for getting a googleOauth Login Url
//In production , this url is what remains behind the the SIGNIN WITH GOOGLE BUTTON
function getAuthUrl()
{
    const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";

    const options = {
        redirect_uri: `http://localhost:${process.env.PORT}/${process.env.REDIRECT_URI}`,
        client_id: process.env.GOOGLE_CLIENT_ID,
        access_type: "offline",
        response_type: "code",
        prompt: "consent",
        scope: [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email'
        ].join(' ')

    };
    return `${rootUrl}?${querystring.stringify(options)}`;

}

//Function for getting the accessToken from Google with the help of  which we can fetch the user details
function getAccessToken({code,clientId,clientSecret,redirectUri}){

    const getTokenUrl = 'https://oauth2.googleapis.com/token';

    const values = {
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
    };

    return axios.post(getTokenUrl,querystring.stringify(values),{
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
    .then((res)=> res.data)
    .catch((error)=> {
        throw new Error(error.message);
    });

}

//Getting the login url
app.get("/googleAuth/url",(req,res)=>{
    const url = getAuthUrl();
    res.json({status: 200,message: "Login url generated !",loginUrl: url});
});


//Getting user info from google and checking if it exists in our system or not
//For testing purposes a FAKE DataBase (a list) has been used
app.get(`/${process.env.REDIRECT_URI}`,async (req,res)=>{
    const code = req.query.code;

    if(!code)
        res.json({status: 400,message: "Access Code missing !"});

    const {id_token, access_token} = await getAccessToken({
        code: code,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: `http://localhost:${process.env.PORT}/${process.env.REDIRECT_URI}`
    })

    //Fetching user profile details
    const googleUser = await axios.get(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`,{
        headers: {
            Authorization: `Bearer ${id_token}`
        }
    })
    .then((res)=>res.data)
    .catch((error)=>{
        console.log("Failed to Fetch User details from Google");
        throw new Error(error.message);
    });

        fakeDB.forEach((item,index,arr)=>{
            if(item.userEmail==googleUser.email){
                res.json({status: 400,message: "User already Exists !"});
            }
            else{
                    arr.push({
                        userName: googleUser.name,
                        userEmail: googleUser.email,
                        userId: uuid.v4()
                    })

                    res.json({status: 200,message: "User Signedin Successfully !"});
            }
        })
});

//Starting the server on localhost
app.listen(process.env.PORT || 3000,()=>{
    console.log(`Application started on port ${process.env.PORT || 3000}`);
});

