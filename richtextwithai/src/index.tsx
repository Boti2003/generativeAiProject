import { render } from 'preact';

import preactLogo from './assets/preact.svg';
import './style.css';
import { openAIHandler } from './backend/openAIHandler';
import { AITextEditorComponent } from './AITextEditorComponent';


export function App() {
	
	return <div class="app">
			<AITextEditorComponent />
		</div>;
	
}


render(<App />, document.getElementById('app'));
