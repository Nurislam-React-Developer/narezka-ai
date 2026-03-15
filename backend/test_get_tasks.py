import urllib.request
import json
try:
    req = urllib.request.Request("http://127.0.0.1:8000/task/23252a00a88c43a2a78fc4a4bec20d2b")
    response = urllib.request.urlopen(req)
    print(response.read().decode())
except Exception as e:
    print(e)
