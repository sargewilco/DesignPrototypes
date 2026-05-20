1. **Update `index.html`**
   - Add a "Flow Direction" select dropdown to the `#connection-properties` pane. Options should be "forward", "reverse", and "bidirectional".
2. **Update `script.js` UI logic**
   - Grab the new dropdown element by ID (`connectionFlowSelect`).
   - In the `group.addEventListener('click')` handler, update `connectionFlowSelect.value` to match the currently selected connection's `flow` property.
   - Add an event listener to `connectionFlowSelect` for the `change` event. When changed, it should update the selected connection's `flow` property, clear and respawn packets accordingly, and toggle the display of `conn.line2` if bidirectional.
3. **Remove inline flow toggling logic**
   - Remove the code in `script.js` that cycles through `flow` directions on a simple `mousedown`/`click` on the connection line. Keep the waypoint logic.
4. **Update Pre-commit steps**
   - Ensure the new logic works smoothly without breaking the existing sequence packet feature.
   - Complete proper pre-commit testing, review, and reflection.
5. **Submit**
   - Submit the change to the user.
