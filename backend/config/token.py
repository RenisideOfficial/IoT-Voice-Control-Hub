from rest_framework_simplejwt.tokens import AccessToken

def generate_jwt(user_id, username, email):
    token = AccessToken()
    token['user_id'] = user_id
    token['username'] = username
    token['email'] = email
    return str(token)

def decode_jwt(token):
    try:
        return AccessToken(token)
    except Exception as e:
        print(f"Failed to decode token: {str(e)}")
        return None