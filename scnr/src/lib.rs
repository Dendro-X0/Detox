use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{Document, Element, Node, ShadowRoot, Text, Window};
use std::collections::VecDeque;

#[wasm_bindgen]
pub struct ScannedText {
    id: String,
    content: String,
}

#[wasm_bindgen]
impl ScannedText {
    #[wasm_bindgen(constructor)]
    pub fn new(id: String, content: String) -> ScannedText {
        ScannedText { id, content }
    }
    
    #[wasm_bindgen(getter)]
    pub fn id(&self) -> String {
        self.id.clone()
    }
    
    #[wasm_bindgen(getter)]
    pub fn content(&self) -> String {
        self.content.clone()
    }
}

// A non-recursive DOM walker that can pierce Shadow DOM
#[wasm_bindgen]
pub fn scan_document(root_node: Node) -> Vec<ScannedText> {
    let mut results = Vec::new();
    let mut queue = VecDeque::new();
    let mut counter = 0;
    
    // Start with the root node
    queue.push_back(root_node);
    
    while let Some(node) = queue.pop_front() {
        // 1. Process Text nodes
        if node.node_type() == Node::TEXT_NODE {
            if let Some(text_content) = node.text_content() {
                let trimmed = text_content.trim();
                if !trimmed.is_empty() {
                    // Get parent element to tag it
                    if let Some(parent) = node.parent_element() {
                        // Check if already tagged
                        let id = if let Some(existing_id) = parent.get_attribute("data-scnr-id") {
                            existing_id
                        } else {
                            counter += 1;
                            let new_id = format!("scnr-{}", counter);
                            let _ = parent.set_attribute("data-scnr-id", &new_id);
                            new_id
                        };
                        
                        results.push(ScannedText::new(id, trimmed.to_string()));
                    }
                }
            }
            continue;
        }
        
        // 2. Filter out scripts, styles, etc.
        if let Some(element) = node.dyn_ref::<Element>() {
            let tag_name = element.tag_name().to_lowercase();
            if tag_name == "script" || tag_name == "style" || tag_name == "noscript" || tag_name == "iframe" {
                continue;
            }
            
            // 3. Check for Shadow Root
            if let Some(shadow_root) = element.shadow_root() {
                // Traverse into Shadow DOM
                let shadow_node: Node = shadow_root.into();
                queue.push_back(shadow_node);
            }
        }
        
        // 4. Traverse children
        let children = node.child_nodes();
        for i in 0..children.length() {
            if let Some(child) = children.item(i) {
                queue.push_back(child);
            }
        }
    }
    
    results
}
