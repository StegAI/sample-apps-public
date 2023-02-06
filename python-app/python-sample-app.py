# ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
# Created by: Richard Cho
# Steg.AI
# Email: richard.cho@steg.ai
# Copyright (c) 2021
# This app provides an example of using Steg.AI's API service. 
# Before following the instructions in the README.md file in the python-app directory to run this app, 
# please enter your API key, image file path, and date strings down below (lines 17 - 24).
# ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

# Import libraries
import json
import requests
import os
from datetime import datetime

# Enter your API key here
APIKEY = ""

# Enter the absolute path to the image file here
absolute_path_to_image = ""

# Enter a date (in one of the acceptable formats: YYYY-MM-DD, YYYY-MM, or YYYY) to start the usage log from. Note: Ensure that the start date is not a future date.
start_date_input = ("YYYY-MM-DD")

BASE_URL = "https://api.steg.ai/"

print("This Python script will run you through Steg.AI's API for uploading an image, encoding / decoding it, and checking the status and usage endpoints.")

#
# UPLOAD ENDPOINT
# This endpoint generates a presigned url for you to upload your media file
#

# Stripping string to retrieve base file name with and without its file extension
base_file = os.path.basename(absolute_path_to_image)
image_file = os.path.splitext(base_file)[0]
file_extension = os.path.splitext(base_file)[1]

print()
print("1. Now running the Upload endpoint.")

headers = {
    "Content-Type": "application/json",
    "x-api-key": APIKEY
}
payload = {
    # NOTE: The following 2 fields are required
    "name": image_file,
    # Change the content_type to the file's respective format, if needed
    "content_type": f"image/{file_extension}", 

    # NOTE: The following 3 fields are optional
    "request_type": "encode", # Either "encode" or "decode" (mainly used for videos for thumbnail creation purposes)
    "owner": "Owner Name",
    "license": {"editorial": True} # Example input; see https://docs.steg.ai/#license-object for more info

    # # NOTE: You can also add custom data in the following "custom" object to the file upload in key-value format
    # "custom": {
    #     "custom_key_1": custom_value_1,
    # }
}

print("Uploading file. Please wait.")

# Uploading the file
response = requests.post(f"{BASE_URL}/upload",
    headers=headers, 
    data=json.dumps(payload)
)

post_to_fields = response.json().get("data").get("post_to")
media_id = response.json().get("data").get("media_id")

# Open the original file
with open(absolute_path_to_image, "rb") as file:
    url = post_to_fields.get("url")
    form_data = post_to_fields.get("fields")
    files = {
        "file": file
    }

    requests.post(url=url, files=files, data=form_data)

payload = {
    "media_id": media_id,

    # NOTE: The following 4 fields are optional if you have the media_id of an uploaded media
    "owner": "Owner Name",
    "license": {"editorial": True},
    "method": 0, # Default value is 0

    # # NOTE: You can also add custom data in the following "custom" object to the file upload in key-value format
    # "custom": {
    #     "custom_key_1": custom_value_1,
    # }
}

#
# ENCODE & CHECK STATUS ENDPOINTS
# Encode: This endpoint encodes an image (that was uploaded using the Upload endpoint) with a payload asynchronously
# Check Status: This endpoint gets the status of a request
#

print()
print("2. Now running the Encode endpoint.")

# Encoding the file
response = requests.post(
    f"{BASE_URL}/encode_image_async", headers=headers, data=json.dumps(payload))

request_id = response.json().get("data").get("request_id")

print("Encoding file and checking media status. Please wait.")

while True:
    # Running Check Status endpoint
    response = requests.get(
        f"{BASE_URL}/media_status?request_id={request_id}", 
        headers=headers
    )
    request_data = response.json().get("data")

    if request_data.get("status") == "Completed.":
        media_data = request_data.get("media_data")
        media_url = media_data.get("media_url")
        response = requests.get(url=media_url)
        
        # Write a new file
        with open(image_file + "_encoded.png", 'wb') as f:
            f.write(response.content)
        break

print("The media status is successful, and the file has been encoded and saved.")

#
# DECODE ENDPOINT
# This endpoint decodes an image asynchronously
#

print()
print("3. Now running the Decode endpoint.")

# Reading the encoded image
with open(image_file + "_encoded.png", "rb") as file:
    url = post_to_fields.get("url")
    form_data = post_to_fields.get("fields")
    files = {
        "file": file
    }

    requests.post(url=url, files=files, data=form_data)

payload = {
    # The following field is required
    "media_id": media_id,
}

response = requests.post(
    f"{BASE_URL}/decode_image_async", 
    headers=headers, 
    data=json.dumps(payload)
)

request_id = response.json().get("data").get("request_id")

print("Decoding file. Please wait.")
while True:
    response = requests.get(
        f"{BASE_URL}/media_status?request_id={request_id}", headers=headers)
    request_data = response.json().get("data")
    if request_data.get("status") == "Completed.":
        media_data = request_data.get("media_data")
        print("Decoded results: " + str(media_data))
        break

#
# USAGE ENDPOINT
# This endpoint returns the usage of each endpoint and the status code
#

print()
print("4. Now running the Usage endpoint.")

# The "start" and "end" querystrings are optional
response = requests.get(BASE_URL + "/usage" + "?start=" + start_date_input, 
    headers={
        "Content-Type": "application/json",
        "x-api-key": APIKEY
    }
)
print("Checking usage endpoint. Please wait.")
print("Total number of items: " + str(json.loads(response.text)["message"]))
json_response = json.loads(response.text)["data"]["items"]

count = 1
for i in json_response:
    print(str(count) + ": " + str(i))
    count += 1
