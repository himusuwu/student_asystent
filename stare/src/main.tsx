import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './pages/App'
import Dashboard from './pages/Dashboard'
import Subjects from './pages/Subjects'
import SubjectDetail from './pages/SubjectDetail'
import SubjectLectures from './pages/SubjectLectures'
import NewNote from './pages/NewNote'
import NewLecture from './pages/NewLecture'
import NoteView from './pages/NoteView'
import LectureView from './pages/LectureView'
import FlashcardsNew from './pages/FlashcardsNew'
import Exams from './pages/Exams'
import Settings from './pages/Settings'
import './styles.css'
import { ToastProvider } from '@/components/ui/Toast'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'subjects', element: <Subjects /> },
      { path: 'subjects/:subjectId', element: <SubjectDetail /> },
      { path: 'subject/:id/lectures', element: <SubjectLectures /> },
      { path: 'new', element: <NewNote /> },
      { path: 'new-lecture', element: <NewLecture /> },
      { path: 'notes/:sessionId', element: <NoteView /> },
      { path: 'lecture/:id', element: <LectureView /> },
      { path: 'flashcards', element: <FlashcardsNew /> },
      { path: 'exams', element: <Exams /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  </StrictMode>
)
