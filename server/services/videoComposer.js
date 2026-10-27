const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

/**
 * Ghép Video Thành Phẩm Hoàn Chỉnh Bằng Motion Tracking Frame-by-Frame
 */
function composeFinalVideo({ headImagePath, mixedAudioPath, topic = 'WORK', lastName = 'BẠN', jobLogger }) {
  return new Promise((resolve, reject) => {
    const materialDir = process.env.MATERIAL_DIR || path.join(__dirname, '../../MILO-20260815T030710Z-1-001/MILO');
    const fontPath = path.join(materialDir, 'milo_material/font/RoadRage-Regular.ttf');

    // 1. Chọn base video và file tracking theo topic
    let baseVideoName = 'study_video_base.mp4';
    let trackFileName = 'track_study.json';
    let topicVerb = 'HỌC';

    if (topic === 'WORK' || topic === 'Office') {
      baseVideoName = 'office_video_base.mp4';
      trackFileName = 'track_office.json';
      topicVerb = 'LÀM';
    } else if (topic === 'WORKOUT' || topic === 'Workout') {
      baseVideoName = 'workout_video_base.mp4';
      trackFileName = 'track_workout.json';
      topicVerb = 'TẬP';
    }

    const baseVideoPath = path.join(materialDir, `milo_material/${baseVideoName}`);
    const trackingJsonPath = path.join(__dirname, trackFileName);
    const outputVideoPath = path.join(jobLogger.jobDir, 'output.mp4');
    const pythonScript = path.join(__dirname, 'motion_video_composer.py');

    const titleText = `CỔ VŨ ${lastName.toUpperCase()} ${topicVerb} TỚI CÙNG`;

    jobLogger.log(`[VIDEO_COMP] Base Video: ${baseVideoPath}`);
    jobLogger.log(`[VIDEO_COMP] Tracking JSON: ${trackingJsonPath}`);
    jobLogger.log(`[VIDEO_COMP] Head: ${headImagePath}`);
    jobLogger.log(`[VIDEO_COMP] Mixed Audio: ${mixedAudioPath}`);

    if (!fs.existsSync(baseVideoPath)) {
      const err = new Error(`Base video not found: ${baseVideoPath}`);
      jobLogger.setError(err);
      return reject(err);
    }

    const pyArgs = [
      pythonScript,
      baseVideoPath,
      headImagePath,
      mixedAudioPath,
      outputVideoPath,
      topic,
      lastName,
      trackingJsonPath,
      fontPath
    ];

    jobLogger.log(`[VIDEO_COMP] Executing Motion Tracked Python Composer...`);
    const pyProcess = spawn('python', pyArgs);

    let fullStderr = '';
    pyProcess.stderr.on('data', (data) => {
      fullStderr += data.toString();
    });

    pyProcess.stdout.on('data', (data) => {
      const msg = data.toString().trim();
      jobLogger.log(`[PYTHON_COMPOSER] ${msg}`);
    });

    pyProcess.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputVideoPath)) {
        jobLogger.log(`[VIDEO_COMP_SUCCESS] Rendered output.mp4: ${outputVideoPath}`);
        resolve({
          videoPath: outputVideoPath,
          titleText
        });
      } else {
        jobLogger.log(`[VIDEO_COMP_ERROR] Python composer error: ${fullStderr}`);
        const err = new Error(`Motion composer failed with exit code ${code}`);
        jobLogger.setError(err);
        reject(err);
      }
    });

    pyProcess.on('error', (err) => {
      jobLogger.setError(err);
      reject(err);
    });
  });
}

module.exports = {
  composeFinalVideo
};
