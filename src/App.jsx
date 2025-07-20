import { useState } from 'react'
import './App.css'
import React from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay();
}

function App() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [events, setEvents] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [title, setTitle] = useState('');
  const [editEventIdx, setEditEventIdx] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [desc, setDesc] = useState('');
  const [recurrence, setRecurrence] = useState('none');
  const [color, setColor] = useState('#0284c7');

  const [daysOfWeek, setDaysOfWeek] = useState([]); // for weekly
  const [customInterval, setCustomInterval] = useState(2); // for custom
  const [customType, setCustomType] = useState('days');

  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editRecurrence, setEditRecurrence] = useState('none');
  const [editColor, setEditColor] = useState('#0284c7');
  const [editDaysOfWeek, setEditDaysOfWeek] = useState([]);
  const [editCustomInterval, setEditCustomInterval] = useState(2);
  const [editCustomType, setEditCustomType] = useState('days');

  const [conflictMsg, setConflictMsg] = useState('');
  const [search, setSearch] = useState('');

  // Load events from localStorage
  React.useEffect(() => {
    const saved = localStorage.getItem('events');
    if (saved) {
      setEvents(JSON.parse(saved));
    }
  }, []);
  // Save events to localStorage
  React.useEffect(() => {
    localStorage.setItem('events', JSON.stringify(events));
  }, [events]);

  function prevMonth() {
    setCurrentMonth(m => {
      if (m === 0) {
        setCurrentYear(y => y - 1);
        return 11;
      }
      return m - 1;
    });
  }
  function nextMonth() {
    setCurrentMonth(m => {
      if (m === 11) {
        setCurrentYear(y => y + 1);
        return 0;
      }
      return m + 1;
    });
  }

  function handleDayClick(day) {
    setSelectedDay(day);
    setShowAdd(true);
    setDate(`${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`);
    setTime('');
    setTitle('');
    setDesc('');
    setRecurrence('none');
    setColor('#0284c7');
    setDaysOfWeek([]);
    setCustomInterval(2);
    setCustomType('days');
  }

  function handleAddEvent() {
    if (title.trim() !== '') {
      let newDaysOfWeek = daysOfWeek;
      if (recurrence === 'weekly') {
        const selectedWeekday = new Date(date).getDay();
        if (!daysOfWeek.includes(selectedWeekday)) {
          newDaysOfWeek = [...daysOfWeek, selectedWeekday];
        }
      }
      if (hasConflict(events, selectedDay, currentMonth, currentYear, time)) {
        setConflictMsg('Event conflict: another event at this time.');
        return;
      }
      setEvents([...events, {
        title,
        day: selectedDay,
        month: currentMonth,
        year: currentYear,
        date,
        time,
        desc,
        recurrence,
        color,
        daysOfWeek: recurrence === 'weekly' ? newDaysOfWeek : [],
        customInterval: recurrence === 'custom' ? customInterval : null,
        customType: recurrence === 'custom' ? customType : null
      }]);
      setTitle('');
      setShowAdd(false);
      setConflictMsg('');
    }
  }

  function handleEventClick(idx) {
    setEditEventIdx(idx);
    setEditTitle(events[idx].title);
    setEditDate(events[idx].date || '');
    setEditTime(events[idx].time || '');
    setEditDesc(events[idx].desc || '');
    setEditRecurrence(events[idx].recurrence || 'none');
    setEditColor(events[idx].color || '#0284c7');
    setEditDaysOfWeek(events[idx].daysOfWeek || []);
    setEditCustomInterval(events[idx].customInterval || 2);
    setEditCustomType(events[idx].customType || 'days');
  }

  function handleEditSave() {
    if (editTitle.trim() !== '') {
      if (hasConflict(events, parseInt(editDate.split('-')[2]), parseInt(editDate.split('-')[1])-1, parseInt(editDate.split('-')[0]), editTime, editEventIdx)) {
        setConflictMsg('Event conflict: another event at this time.');
        return;
      }
      setEvents(evts => evts.map((e, i) => i === editEventIdx ? {
        ...e,
        title: editTitle,
        date: editDate,
        time: editTime,
        desc: editDesc,
        recurrence: editRecurrence,
        color: editColor,
        daysOfWeek: editRecurrence === 'weekly' ? editDaysOfWeek : [],
        customInterval: editRecurrence === 'custom' ? editCustomInterval : null,
        customType: editRecurrence === 'custom' ? editCustomType : null
      } : e));
      setEditEventIdx(null);
      setEditTitle('');
      setConflictMsg('');
    }
  }
  function handleDelete() {
    setEvents(evts => evts.filter((_, i) => i !== editEventIdx));
    setEditEventIdx(null);
    setEditTitle('');
  }

  // Helper to check if event occurs on a given day
  function eventOccursOnDay(e, day, month, year) {
    // Always show on the original event date
    if (e.day === day && e.month === month && e.year === year) {
      return true;
    }
    if (e.recurrence === 'none' || !e.recurrence) {
      return false;
    }
    const eventDate = new Date(e.date || `${e.year}-${String(e.month+1).padStart(2,'0')}-${String(e.day).padStart(2,'0')}`);
    const thisDate = new Date(year, month, day);
    if (e.recurrence === 'daily') {
      return thisDate > eventDate;
    }
    if (e.recurrence === 'weekly') {
      return thisDate > eventDate && e.daysOfWeek && e.daysOfWeek.includes(thisDate.getDay());
    }
    if (e.recurrence === 'monthly') {
      return thisDate > eventDate && eventDate.getDate() === day;
    }
    if (e.recurrence === 'custom') {
      if (!e.customInterval || !e.customType) return false;
      let diff = Math.floor((thisDate - eventDate) / (1000*60*60*24));
      if (e.customType === 'days') {
        return thisDate > eventDate && diff % e.customInterval === 0;
      }
      if (e.customType === 'weeks') {
        let weeks = Math.floor(diff / 7);
        return thisDate > eventDate && weeks % e.customInterval === 0 && thisDate.getDay() === eventDate.getDay();
      }
      if (e.customType === 'months') {
        let months = (year - eventDate.getFullYear()) * 12 + (month - eventDate.getMonth());
        return thisDate > eventDate && months % e.customInterval === 0 && eventDate.getDate() === day;
      }
    }
    return false;
  }

  function hasConflict(evts, day, month, year, time, ignoreIdx = null) {
    return evts.some((e, i) => {
      if (ignoreIdx !== null && i === ignoreIdx) return false;
      if (e.time && time && e.time === time && eventOccursOnDay(e, day, month, year)) return true;
      return false;
    });
  }

  function onDragEnd(result) {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    const [fromDay, fromIdx] = draggableId.split('-').map(Number);
    const toDay = Number(destination.droppableId);
    // Find the event
    const eventIdx = fromIdx;
    const event = events[eventIdx];
    // Only allow drag to a different day in the same month/year
    if (toDay === event.day && currentMonth === event.month && currentYear === event.year) return;
    // Check for conflict
    if (hasConflict(events, toDay, currentMonth, currentYear, event.time)) {
      setConflictMsg('Event conflict: another event at this time.');
      return;
    }
    // Move event
    setEvents(evts => evts.map((e, i) => i === eventIdx ? {
      ...e,
      day: toDay,
      month: currentMonth,
      year: currentYear,
      date: `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(toDay).padStart(2,'0')}`,
      recurrence: 'none', // Clear recurrence on drag
      daysOfWeek: [],
      customInterval: null,
      customType: null
    } : e));
    setConflictMsg('');
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfWeek(currentYear, currentMonth);
  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  return (
    <div className="calendar-wrapper">
      <h2>Event Calendar</h2>
      {conflictMsg && <div style={{color:'#f44336',marginBottom:'8px'}}>{conflictMsg}</div>}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
        <button onClick={prevMonth}>{'<'}</button>
        <div>{currentYear} - {currentMonth + 1}</div>
        <button onClick={nextMonth}>{'>'}</button>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="calendar-grid">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d} className="calendar-header">{d}</div>)}
          {days.map((day, idx) => (
            <Droppable droppableId={day ? String(day) : 'empty'} key={idx} isDropDisabled={!day}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  key={idx}
                  className={
                    'calendar-cell' +
                    (day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear() ? ' today' : '')
                  }
                  onClick={day ? () => handleDayClick(day) : undefined}
                  style={{ cursor: day ? 'pointer' : 'default', background: day ? '#fff' : 'transparent', minHeight: '60px' }}
                >
                  {day}
                  <div style={{ fontSize: '0.7em' }}>
                    {events.filter(e => eventOccursOnDay(e, day, currentMonth, currentYear)).map((e, i) => {
                      const idx = events.findIndex(ev => ev === e);
                      return (
                        <Draggable draggableId={day + '-' + idx} index={idx} key={day + '-' + idx} isDragDisabled={!day}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                background: e.color || '#eee',
                                margin: '2px 0',
                                borderRadius: '2px',
                                padding: '2px',
                                cursor: 'pointer',
                                color: '#000',
                                ...provided.draggableProps.style
                              }}
                              onClick={ev => { ev.stopPropagation(); handleEventClick(idx); }}
                            >
                              {e.title}
                            </div>
                          )}
                        </Draggable>
                      )
                    })}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
      {showAdd && (
        <div className="modal">
          <div className="modal-content">
            <h3>Add Event for {selectedDay}/{currentMonth+1}/{currentYear}</h3>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Event title" />
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            <input type="time" value={time} onChange={e => setTime(e.target.value)} />
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description" style={{width:'100%',marginBottom:'8px'}} />
            <select value={recurrence} onChange={e => setRecurrence(e.target.value)} style={{width:'100%',marginBottom:'8px'}}>
              <option value="none">No Recurrence</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom</option>
            </select>
            {recurrence === 'weekly' && (
              <div style={{marginBottom:'8px'}}>
                {[0,1,2,3,4,5,6].map(d => (
                  <label key={d} style={{marginRight:'6px'}}>
                    <input type="checkbox" checked={daysOfWeek.includes(d)} onChange={e => {
                      if (e.target.checked) setDaysOfWeek([...daysOfWeek, d]);
                      else setDaysOfWeek(daysOfWeek.filter(x => x !== d));
                    }} />
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]}
                  </label>
                ))}
              </div>
            )}
            {recurrence === 'custom' && (
              <div style={{marginBottom:'8px'}}>
                Every <input type="number" min="1" value={customInterval} onChange={e => setCustomInterval(Number(e.target.value))} style={{width:'50px'}} />
                <select value={customType} onChange={e => setCustomType(e.target.value)}>
                  <option value="days">days</option>
                  <option value="weeks">weeks</option>
                  <option value="months">months</option>
                </select>
              </div>
            )}
            <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{width:'100%',marginBottom:'8px'}} />
            <button onClick={handleAddEvent}>Add</button>
            <button onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}
      {editEventIdx !== null && (
        <div className="modal">
          <div className="modal-content">
            <h3>Edit Event</h3>
            <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Event title" />
            <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
            <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} />
            <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description" style={{width:'100%',marginBottom:'8px'}} />
            <select value={editRecurrence} onChange={e => setEditRecurrence(e.target.value)} style={{width:'100%',marginBottom:'8px'}}>
              <option value="none">No Recurrence</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom</option>
            </select>
            {editRecurrence === 'weekly' && (
              <div style={{marginBottom:'8px'}}>
                {[0,1,2,3,4,5,6].map(d => (
                  <label key={d} style={{marginRight:'6px'}}>
                    <input type="checkbox" checked={editDaysOfWeek.includes(d)} onChange={e => {
                      if (e.target.checked) setEditDaysOfWeek([...editDaysOfWeek, d]);
                      else setEditDaysOfWeek(editDaysOfWeek.filter(x => x !== d));
                    }} />
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]}
                  </label>
                ))}
              </div>
            )}
            {editRecurrence === 'custom' && (
              <div style={{marginBottom:'8px'}}>
                Every <input type="number" min="1" value={editCustomInterval} onChange={e => setEditCustomInterval(Number(e.target.value))} style={{width:'50px'}} />
                <select value={editCustomType} onChange={e => setEditCustomType(e.target.value)}>
                  <option value="days">days</option>
                  <option value="weeks">weeks</option>
                  <option value="months">months</option>
                </select>
              </div>
            )}
            <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} style={{width:'100%',marginBottom:'8px'}} />
            <button onClick={handleEditSave}>Save</button>
            <button onClick={handleDelete} style={{ background: '#f44336', color: '#fff' }}>Delete</button>
            <button onClick={() => setEditEventIdx(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App
