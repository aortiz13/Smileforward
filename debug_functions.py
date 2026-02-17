import json
import re
import os

filepath = "/Users/adrianortiz/.gemini/antigravity/brain/f991e276-e051-4461-a202-16c290ac3ed5/.system_generated/steps/191/output.txt"

with open(filepath, 'r') as f:
    content = f.read()

print(f"Content length: {len(content)}")
print(f"Start of content: {content[:100]}")

match = re.search(r'(\[\s*\{.*\}\s*\])', content, re.DOTALL)
json_str = ""
if match:
    json_str = match.group(1)
    print("Regex matched.")
else:
    print("Regex failed. Trying fallback regex.")
    match = re.search(r'(\[\s*\])', content, re.DOTALL)
    if match:
        json_str = match.group(1)
    else:
        print("Fallback Regex failed.")

if not json_str:
    print("No JSON string found.")
else:
    print(f"JSON String start: {json_str[:100]}")
    try:
        data = json.loads(json_str)
        print("Direct parsed length:", len(data))
    except Exception as e:
        print(f"Direct parse error: {e}")
        
        # Try unescape
        try:
            cleaned = json_str.replace('\\"', '"')
            print(f"Cleaned start: {cleaned[:100]}")
            data = json.loads(cleaned)
            print("Unescape parsed length:", len(data))
        except Exception as e2:
            print(f"Unescape parse error: {e2}")
            
            # Try loading as string first (maybe it's a JSON string)
            try:
                # If the string is like "[...]", json.loads might fail if inside is escaped.
                # But what if we treat the whole things as a JSON string?
                # No, it's not wrapped in quotes in the regex match.
                pass
            except:
                pass
