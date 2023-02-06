// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// Created by: Richard Cho
// Steg.AI
// Email: richard.cho@steg.ai
// Copyright (c) 2021
// This app provides an example of using Steg.AI's API service. 
// Before following the instructions in the README.md file in the javascript-app directory to run this app, 
// please enter your API key, image file path, and date strings down below (lines 17 - 24).
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

// Import libraries
import fs from "fs";
import { Blob } from "buffer";
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Enter your API key here
const APIKEY = "";

// Enter the absolute path to the image file here
const absolutePathOfFile = "";

// Enter a date (in one of the acceptable formats: YYYY-MM-DD, YYYY-MM, or YYYY) to start the usage log from. Note: Ensure that the start date is not a future date.
const startDateInput = ("YYYY-MM-DD");

const BASEURL = "https://api.steg.ai/";

//
// UPLOAD ENDPOINT HELPER FUNCTION
// This endpoint generates a presigned url for you to upload your media file
// 

async function UploadEndpoint(fileName, fileExtension, method){

    const uploadResponse = await fetch(
        `${BASEURL}/upload`, {
        method: "POST",
        headers: {
            "x-api-key": APIKEY,
        },
        body: JSON.stringify({
            // NOTE: The following 2 fields are required
            "name": fileName,
            "content_type": `image/${fileExtension}`,

            // NOTE: The following 4 fields are optional
            "request_type": method, // Either "encode" or "decode" (mainly used for videos for thumbnail creation purposes)
            "owner": "Owner Name",
            "license": {"editorial": true}, // This is an example input; see https://docs.steg.ai/#license-object for more info

            // // NOTE: You can also add custom data in the following "custom" object to the file upload in key-value format
            // "custom": {
            //     "custom_key_1": custom_value_1,
            // }
        })},
    );

    const responseObject = await uploadResponse.json();
    const postToFields = await responseObject.data.post_to.fields;
    const presignedURL = await responseObject.data.post_to.url;
    const mediaID = responseObject.data.media_id;

    const uploadFormData = new FormData();
    for (const [key, value] of Object.entries(postToFields)) {
        uploadFormData.append(key, value);
    }

    // Create image file blob from image path
    const uploadBuffer = fs.readFileSync(fileName);
    const imageFileFromPathData = new Blob([uploadBuffer]);

    uploadFormData.append("file", imageFileFromPathData);

    const uploadToPresignedURLResponse = await fetch(
        presignedURL, {
        method: "POST",
        body: uploadFormData,

        }
    );

    console.log("The image has successfully been uploaded! \n");

    return mediaID;
}

async function API() {

    console.log("This JavaScript app will run you through Steg.AI's API for uploading an image, encoding / decoding it, and checking the status and usage endpoints. \n");

    // Stripping string to retrieve base file name (without its file extension) and the file extension itself
    const path = require('path');
    const fileExtension = absolutePathOfFile.split('.').pop();
    const imageFile = path.basename(absolutePathOfFile).split('.')[0];

    // Creating a variable to store the encoded file's name
    const encodedImage = `${imageFile}_encoded.${fileExtension}`;

    // 
    // UPLOAD ENDPOINT (for the original image)
    // 

    console.log("1. Now running the Upload endpoint to upload the original image.")
    const mediaID = await UploadEndpoint(absolutePathOfFile, fileExtension, "encode");

    // 
    // ENCODE & CHECK STATUS ENDPOINTS
    // Encode: This endpoint encodes an image (that was uploaded using the Upload endpoint) with a payload asynchronously
    // Check Status: This endpoint gets the status of a request
    // 

    console.log("2. Now running the Encode & Check Status endpoints.");

    const encodeResponse = await fetch(
        `${BASEURL}/encode_image_async`, {
            method: "POST",
            headers: {
                "x-api-key": APIKEY
            },
            body: JSON.stringify({
                // NOTE: The following field is required
                "media_id": mediaID,

                // NOTE: The following 4 fields are optional if you have the media_id of an uploaded media
                "license": {"editorial": true}, // Example input; see https://docs.steg.ai/#license-object for more info
                "method": 0, // Default value is 0
                "owner": "Owner Name",

                // NOTE: You can also add custom data in the following "custom" object to the file upload in key-value format
                // "custom": {
                //     "custom_key_1": custom_value_1,
                // }
            })
        }
    );

    const encodeResponseObject = await encodeResponse.json();

    const encodeRequestID = encodeResponseObject.data.request_id;

    while (true){
        const mediaStatusResponse = await fetch(
            // Running Check Status endpoint
            `${BASEURL}/media_status?request_id=${encodeRequestID}`, {
            method: "GET",
            headers: {
                "x-api-key": APIKEY
            }}
        );

        const mediaStatusResponseObject = await mediaStatusResponse.json();

        if (mediaStatusResponseObject.data.status === "Completed."){

            const mediaData = mediaStatusResponseObject.data.media_data;
            const mediaURL = mediaData.media_url;

            const mediaURLResponse = await fetch(mediaURL);

            const mediaURLBuffer = Buffer.from(await mediaURLResponse.arrayBuffer())

            const imageFileObject = fs.writeFile(encodedImage, mediaURLBuffer, function (err) {
                if (err) throw err;
            });
            break;
        }
    }

    console.log("The media status is successful, and the file has been encoded and saved. \n");

    // 
    // UPLOAD ENDPOINT (for the encoded image)
    // 

    console.log("3. Now running the Upload endpoint to upload the encoded image.");
    const mediaIDDecode = await UploadEndpoint(encodedImage, fileExtension, "decode");

    // 
    // DECODE ENDPOINT
    // This endpoint decodes an image asynchronously
    // 

    console.log("4. Now running the Decode endpoint.");

    const decodeResponse = await fetch(
        `${BASEURL}/decode_image_async`, {
        method: "POST",
        headers: {
            "x-api-key": APIKEY
        },
        body: JSON.stringify({
            // NOTE: The following field is required
            "media_id": mediaIDDecode
        })}
    );

    const decodeResponseObject = await decodeResponse.json();
    const decodeRequestID = decodeResponseObject.data.request_id;

    while (true){
        const mediaStatusResponse = await fetch(
            `${BASEURL}/media_status?request_id=${decodeRequestID}`, {
            method: "GET",
            headers: {
                "x-api-key": APIKEY
            }}
        );

        const mediaStatusResponseObject = await mediaStatusResponse.json();

        if (mediaStatusResponseObject.data.status === "Completed."){

            const mediaData = mediaStatusResponseObject.data.media_data;
            console.log(`Decoded results: ${JSON.stringify(mediaData)} \n`);
            break;
        }
    }   

    // 
    // USAGE ENDPOINT
    // This endpoint returns the usage of each endpoint and the status code
    // 

    console.log("5. Now running the Usage endpoint.");

    const usageResponse = await fetch(
        // NOTE: The "start" and "end" querystrings are optional
        `${BASEURL}/usage?start=${startDateInput}`, {
        method: "GET",
        headers: {
            "x-api-key": APIKEY
        }}
    );

    const usageResponseObject = await usageResponse.json();
    const totalItems = usageResponseObject.message;
    console.log(`Total number of items: ${String(totalItems)}`);

    for (let i = 0; i < usageResponseObject.data.items.length; i++){
        console.log(`${String(i)}: ${JSON.stringify(usageResponseObject.data.items[i])}`);
    }
};

API();
