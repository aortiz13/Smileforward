#!/usr/bin/env python3
"""Migrate files from Supabase Storage to MinIO"""

import json
import subprocess
import os
import urllib.request
import urllib.parse

SUPABASE_URL = "https://meqdgcaldactjjzqifsz.supabase.co/storage/v1/object/public"

with open("/tmp/file_list.json") as f:
    files = json.load(f)

total = len(files)
errors = 0
print("Migrating {} files...".format(total))

for i, item in enumerate(files, 1):
    bucket = item["bucket"]
    name = item["name"]
    encoded_name = urllib.parse.quote(name, safe="/")
    url = "{}/{}/{}".format(SUPABASE_URL, bucket, encoded_name)
    local_path = "/tmp/storage_migration/{}/{}".format(bucket, name)

    os.makedirs(os.path.dirname(local_path), exist_ok=True)

    label = "[{}/{}] {}/{}".format(i, total, bucket, name)
    print(label, end=" ")

    try:
        urllib.request.urlretrieve(url, local_path)
        dest = "local/{}/{}".format(bucket, name)
        result = subprocess.run(
            ["mc", "cp", local_path, dest],
            capture_output=True, text=True, timeout=120
        )
        if result.returncode == 0:
            print("OK")
            os.remove(local_path)
        else:
            print("UPLOAD FAIL: " + result.stderr.strip())
            errors += 1
    except Exception as e:
        print("SKIP ({})".format(e))
        errors += 1

print("")
print("====================")
print("Done! {} files processed, {} errors".format(total, errors))
subprocess.run(["rm", "-rf", "/tmp/storage_migration"])
