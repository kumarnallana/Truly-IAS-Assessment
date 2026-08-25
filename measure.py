import cv2
import numpy as np

def measure_image(filepath, name):
    img = cv2.imread(filepath)
    if img is None:
        print(f"Could not load {filepath}")
        return

    h, w, c = img.shape
    
    # The image is a filmstrip. Let's find vertical lines that separate the frames.
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # The background of the filmstrip itself (outside the white cards) is usually a solid color
    # Let's find the card bounding boxes directly.
    # The card is white (255,255,255).
    # Threshold for near-white
    _, thresh = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY)
    
    # Find contours
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Filter for large contours (the cards)
    cards = []
    for cnt in contours:
        x, y, cw, ch = cv2.boundingRect(cnt)
        if cw > 200 and ch > 200: # Assuming card is reasonably large
            cards.append((x, y, cw, ch))
            
    # Sort by X coordinate (left to right)
    cards.sort(key=lambda c: c[0])
    
    print(f"--- Measurements for {name} ---")
    print(f"Found {len(cards)} cards in the filmstrip.")
    
    if len(cards) > 0:
        card1 = cards[0]
        print(f"First Card Geometry: x={card1[0]}, y={card1[1]}, width={card1[2]}, height={card1[3]}")
        
        # Now let's analyze the internal structure of the first card
        # Crop the first card
        x, y, cw, ch = card1
        card_img = img[y:y+ch, x:x+cw]
        
        # If it's Login, there is a blue panel on the left.
        # Let's find the width of the blue panel by checking the average color of columns
        if "login" in name.lower():
            # Blue is typically BGR where B > R and B > G
            blue_cols = 0
            for col in range(cw):
                col_bgr = np.mean(card_img[:, col, :], axis=0)
                # Check if this column is predominantly blue
                if col_bgr[0] > col_bgr[2] + 20 and col_bgr[0] > 100:
                    blue_cols += 1
                else:
                    # Once we hit non-blue, we assume the panel ended
                    if blue_cols > 50:
                        break
                        
            print(f"Login Blue Panel Width: {blue_cols}px")
            ratio = (blue_cols / cw) * 100
            print(f"Login Split Ratio: {ratio:.1f}% Brand / {100-ratio:.1f}% Form")

        elif "registration" in name.lower():
            # Registration has form on left, requirements on right
            print("Registration is single white card. Will derive form/req ratios based on typical content spread.")

measure_image(r"C:\Users\Kumar\.gemini\antigravity-ide\brain\209794ed-e294-4b2b-97c2-e5e4a37cd211\.user_uploaded\media_1787647166587.png", "Registration Flow")
measure_image(r"C:\Users\Kumar\.gemini\antigravity-ide\brain\209794ed-e294-4b2b-97c2-e5e4a37cd211\.user_uploaded\media_1787647174192.png", "Login Flow")
