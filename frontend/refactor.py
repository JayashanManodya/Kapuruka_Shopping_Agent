import re

with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the new input bar JSX for reuse
input_jsx = '''
          {/* Interactive Chat Input Bar */}
          <div style={{ padding: "20px 24px", display: "flex", justifyContent: "center", width: "100%" }}>
            <div style={{ display: "flex", gap: "12px", position: "relative", alignItems: "center", background: "#fff", padding: "8px 16px", borderRadius: "30px", width: "100%", maxWidth: "800px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
              <button
                style={{
                  background: "transparent",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#666",
                  padding: "8px",
                  flexShrink: 0
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
              </button>
              <input
                type="text"
                placeholder="Ask Kapruka Agent..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={isLoading}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  color: "#333",
                  fontSize: "1rem",
                  outline: "none",
                  height: "40px",
                }}
              />
              <button
                onClick={toggleListening}
                disabled={isLoading}
                className="glow-button"
                style={{
                  background: "var(--brand-purple-dark)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "50%",
                  width: "44px",
                  height: "44px",
                  padding: 0,
                  cursor: isLoading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}
                id="send-msg-btn"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </button>
            </div>
          </div>
'''

chips_jsx = '''
              {(() => {
                const chips = [
                  { icon: "??", label: "Find a gift for someone special", msg: "I need a gift for my friend. Can you suggest something under 3000 LKR?" },
                  { icon: "??", label: "Search chocolates & sweets", msg: "Show me chocolate boxes available for delivery today." },
                  { icon: "??", label: "Browse flowers & bouquets", msg: "Search for flower bouquets for a birthday." },
                  { icon: "??", label: "Check delivery availability", msg: "Can you deliver to Kandy today?" },
                ];
                return (
                  <div className="animate-fade-in" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px", marginTop: "24px" }}>
                    {chips.map((chip, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(chip.msg)}
                        style={{
                          display: "flex", alignItems: "center", gap: "8px",
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.14)",
                          color: "#fff", padding: "9px 16px", borderRadius: "24px",
                          fontSize: "0.85rem", fontWeight: 500, cursor: "pointer",
                          transition: "all 0.18s ease",
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = "rgba(255,210,0,0.12)";
                          e.currentTarget.style.borderColor = "rgba(255,210,0,0.4)";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                          e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
                        }}
                      >
                        <span>{chip.icon}</span>
                        <span>{chip.label}</span>
                      </button>
                    ))}
                  </div>
                );
              })()}
'''

# Find the start of the chat section
start_marker = '{/* Right Section Chat Interface */}'
end_marker = '</section>'

start_idx = content.find(start_marker)

# Find the end of section tag that corresponds to this section
temp = content[start_idx:]
end_idx = start_idx + temp.find(end_marker) + len(end_marker)

section_content = content[start_idx:end_idx]

# We need to extract the existing Active Chat Header and Messages Feed Container (excluding the old chips and input bar)
header_start = section_content.find('{/* Active Chat Header */}')
feed_start = section_content.find('{/* Messages Feed Container */}')
feed_content_start = section_content.find('{(() => {', feed_start)  # The deduped map

# The messages feed ends right before '{/* Interactive Chat Input Bar */}'
input_bar_start = section_content.find('{/* Interactive Chat Input Bar */}')

chat_header_and_feed = section_content[header_start:feed_start] + \\
    '          {/* Messages Feed Container */}\\n          <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>\\n\\n' + \\
    section_content[feed_content_start:input_bar_start] + '</div>\\n'

new_section = f'''{start_marker}
        <section className="glass-card chat-section">
          {{messages.length === 0 ? (
            <div style={{{{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "40px 20px" }}}}>
              <h1 style={{{{ color: "#fff", fontSize: "1.8rem", fontWeight: 600, marginBottom: "40px", textAlign: "center" }}}}>
                Hey there! Ready to dive into Kapruka?
              </h1>
              <div style={{{{ width: "100%", maxWidth: "800px" }}}}>
                {{/* We render the input bar WITHOUT the outer padding so it fits well */}}
                <div style={{{{ display: "flex", gap: "12px", position: "relative", alignItems: "center", background: "#fff", padding: "8px 16px", borderRadius: "30px", width: "100%", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}}}>
                  <button
                    style={{{{
                      background: "transparent",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: "#666",
                      padding: "8px",
                      flexShrink: 0
                    }}}}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                    </svg>
                  </button>
                  <input
                    type="text"
                    placeholder="Ask Kapruka Agent..."
                    value={{inputText}}
                    onChange={{(e) => setInputText(e.target.value)}}
                    onKeyDown={{handleKeyPress}}
                    disabled={{isLoading}}
                    style={{{{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      color: "#333",
                      fontSize: "1rem",
                      outline: "none",
                      height: "40px",
                    }}}}
                  />
                  <button
                    onClick={{toggleListening}}
                    disabled={{isLoading}}
                    className="glow-button"
                    style={{{{
                      background: "var(--brand-purple-dark)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "50%",
                      width: "44px",
                      height: "44px",
                      padding: 0,
                      cursor: isLoading ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}}}
                    id="send-msg-btn-empty"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                    </svg>
                  </button>
                </div>
{chips_jsx}
              </div>
            </div>
          ) : (
            <>
{chat_header_and_feed}
{input_jsx}
            </>
          )}
        </section>'''

new_content = content[:start_idx] + new_section + content[end_idx:]

with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Refactor complete")
