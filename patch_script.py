import re

with open('script.js', 'r') as f:
    content = f.read()

# Just put `updateNodeStatusHighlights()` at the end of `updateConnections()`
end_of_func = '''            if (targetHitarea) targetHitarea.setAttribute('d', targetPathD);
            if (targetBackground) targetBackground.setAttribute('d', targetPathD);
        });
    }'''

replacement = '''            if (targetHitarea) targetHitarea.setAttribute('d', targetPathD);
            if (targetBackground) targetBackground.setAttribute('d', targetPathD);
        });
        updateNodeStatusHighlights();
    }'''

content = content.replace(end_of_func, replacement, 1)

with open('script.js', 'w') as f:
    f.write(content)
